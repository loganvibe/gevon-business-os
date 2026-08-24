import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateApiKeyPair, hashApiKey } from "@/platform/integrations/api-keys";
import { generateWebhookSecret, hashSecret } from "@/platform/integrations/crypto";
import { writeAudit } from "@/platform/audit.helpers";

export const listDeveloperApps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("developer_apps")
      .select("*")
      .or(`user_id.eq.${context.userId},company_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDeveloperApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      redirectUris: z.array(z.string().url()).default([]),
      scopes: z.array(z.string()).default(["sales.read"]),
      companyId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("developer_apps")
      .insert({
        company_id: data.companyId ?? null,
        user_id: context.userId,
        name: data.name,
        description: data.description,
        redirect_uris: data.redirectUris,
        scopes: data.scopes,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id ?? null, action: "developer.app.created", entityType: "developer_app", entityId: row.id });
    return row;
  });

export const updateDeveloperApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      redirectUris: z.array(z.string().url()).optional(),
      scopes: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.redirectUris) updates.redirect_uris = data.redirectUris;
    if (data.scopes) updates.scopes = data.scopes;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    const { data: row, error } = await supabase.from("developer_apps").update(updates).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id ?? null, action: "developer.app.updated", entityType: "developer_app", entityId: row.id });
    return row;
  });

export const deleteDeveloperApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("developer_apps").select("company_id").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { error: delErr } = await supabase.from("developer_apps").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    await writeAudit(context, { companyId: row.company_id ?? null, action: "developer.app.deleted", entityType: "developer_app", entityId: data.id });
    return { ok: true };
  });

export const listAppKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ appId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.from("developer_app_keys").select("*").eq("app_id", data.appId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createAppKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ appId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { key, prefix, hash } = generateApiKeyPair();
    const secret = generateWebhookSecret();
    const { data: row, error } = await supabase
      .from("developer_app_keys")
      .insert({
        app_id: data.appId,
        key_prefix: prefix,
        key_hash: hash,
        secret_hash: hashSecret(secret),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, key, secret, prefix };
  });

export const revokeAppKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("developer_app_keys").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: context.userId }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: null, action: "developer.key.revoked", entityType: "developer_app_key", entityId: data.id });
    return { ok: true };
  });
