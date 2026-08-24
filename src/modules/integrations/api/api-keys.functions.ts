import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateApiKeyPair, hashApiKey } from "@/platform/integrations/api-keys";
import { writeAudit } from "@/platform/audit.helpers";

export const listApiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("api_keys")
      .select("id, company_id, name, description, key_prefix, status, expires_at, last_used_at, created_at, revoked_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      scopes: z.array(z.string()).default(["sales.read", "inventory.read", "orders.read"]),
      expiresAt: z.string().datetime().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { key, prefix, hash } = generateApiKeyPair();
    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description,
        key_prefix: prefix,
        key_hash: hash,
        expires_at: data.expiresAt,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (row) {
      const scopes = (data.scopes ?? []).map((s) => ({ api_key_id: row.id, scope: s }));
      await supabase.from("api_key_scopes").insert(scopes);
    }
    await writeAudit(context, { companyId: data.companyId, action: "api_key.created", entityType: "api_key", entityId: row.id, after: { name: data.name } });
    return { id: row.id, key, prefix, scopes: data.scopes };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: key, error } = await supabase.from("api_keys").select("company_id, name").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { error: updErr } = await supabase.from("api_keys").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: context.userId }).eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    await writeAudit(context, { companyId: key.company_id, action: "api_key.revoked", entityType: "api_key", entityId: data.id, after: { name: key.name } });
    return { ok: true };
  });

export const listApiKeyScopes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ apiKeyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.from("api_key_scopes").select("*").eq("api_key_id", data.apiKeyId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addApiKeyScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ apiKeyId: z.string().uuid(), scope: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("api_key_scopes").insert({ api_key_id: data.apiKeyId, scope: data.scope });
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: null, action: "api_key.scope_added", entityType: "api_key", entityId: data.apiKeyId, after: { scope: data.scope } });
    return { ok: true };
  });

export const removeApiKeyScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("api_key_scopes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: null, action: "api_key.scope_removed", entityType: "api_key", entityId: data.id });
    return { ok: true };
  });
