import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptSecret, hashSecret, generateApiKey } from "@/platform/integrations/crypto";
import { writeAudit } from "@/platform/audit.helpers";

export const listCompanyIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("company_integrations")
      .select("*, integration_registries(id, name, provider, category, description, logo_url)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCompanyIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("company_integrations")
      .select("*, integration_registries(id, name, provider, category)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Integration not found");
    return row;
  });

export const createCompanyIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      integrationId: z.string().uuid(),
      name: z.string().min(1),
      companyId: z.string().uuid(),
      configuration: z.record(z.string(), z.unknown()).default({}),
      credentials: z.record(z.string(), z.unknown()).default({}),
      settings: z.record(z.string(), z.unknown()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const encrypted = await encryptSecret(JSON.stringify(data.credentials ?? {}));
    const { data: row, error } = await supabase
      .from("company_integrations")
      .insert({
        company_id: data.companyId,
        integration_id: data.integrationId,
        name: data.name,
        configuration: data.configuration,
        credentials_encrypted: encrypted,
        settings: data.settings,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id, action: "integration.connected", entityType: "company_integration", entityId: row.id, after: { name: data.name, integrationId: data.integrationId } });
    return row;
  });

export const updateCompanyIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      configuration: z.record(z.string(), z.unknown()).optional(),
      credentials: z.record(z.string(), z.unknown()).optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
      isEnabled: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.configuration) updates.configuration = data.configuration;
    if (data.settings) updates.settings = data.settings;
    if (data.isEnabled !== undefined) updates.is_enabled = data.isEnabled;
    if (data.credentials) {
      updates.credentials_encrypted = await encryptSecret(JSON.stringify(data.credentials));
    }
    const { data: row, error } = await supabase.from("company_integrations").update(updates).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id, action: "integration.updated", entityType: "company_integration", entityId: row.id });
    return row;
  });

export const deleteCompanyIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("company_integrations").delete().eq("id", data.id).select("company_id, name").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id, action: "integration.disconnected", entityType: "company_integration", entityId: data.id, after: { name: row.name } });
    return { ok: true };
  });

export const testConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, message: "Connection test simulated successfully" };
  });
