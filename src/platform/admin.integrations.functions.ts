import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePlatformAdmin, requirePlatformRole } from "@/integrations/platform/admin-middleware";
import { writeAudit } from "@/platform/audit.helpers";

export const listAllIntegrations = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: registries } = await supabase.from("integration_registries").select("*").order("name");
    const { data: counts } = await supabase.from("company_integrations").select("integration_id, status");
    const map = new Map<string, { total: number; active: number; error: number }>();
    for (const c of counts ?? []) {
      const entry = map.get(c.integration_id) ?? { total: 0, active: 0, error: 0 };
      entry.total++;
      if (c.status === "active") entry.active++;
      if (c.status === "error") entry.error++;
      map.set(c.integration_id, entry);
    }
    return (registries ?? []).map((r: any) => ({ ...r, stats: map.get(r.id) ?? { total: 0, active: 0, error: 0 } }));
  });

export const createRegistryEntry = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole("super_admin")])
  .validator((d: unknown) =>
    z.object({
      name: z.string().min(1),
      provider: z.string().min(1),
      category: z.string().min(1),
      description: z.string().optional(),
      adapterClass: z.string().optional(),
      requiredPermissions: z.array(z.string()).default([]),
      supportedCapabilities: z.array(z.string()).default([]),
      configRequirements: z.record(z.string(), z.unknown()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("integration_registries").insert({
      name: data.name,
      provider: data.provider,
      category: data.category,
      description: data.description,
      adapter_class: data.adapterClass,
      required_permissions: data.requiredPermissions,
      supported_capabilities: data.supportedCapabilities,
      config_requirements: data.configRequirements,
      status: "active",
    }).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: null, action: "platform.integration.registry_created", entityType: "integration_registry", entityId: row.id });
    return row;
  });

export const updateRegistryEntry = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole("super_admin")])
  .validator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["draft", "active", "paused", "error", "deprecated"]).optional(),
      requiredPermissions: z.array(z.string()).optional(),
      supportedCapabilities: z.array(z.string()).optional(),
      configRequirements: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status) updates.status = data.status;
    if (data.requiredPermissions) updates.required_permissions = data.requiredPermissions;
    if (data.supportedCapabilities) updates.supported_capabilities = data.supportedCapabilities;
    if (data.configRequirements) updates.config_requirements = data.configRequirements;
    const { data: row, error } = await supabase.from("integration_registries").update(updates).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: null, action: "platform.integration.registry_updated", entityType: "integration_registry", entityId: data.id });
    return row;
  });

export const toggleIntegrationStatus = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "operations"])])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["active", "paused", "deprecated"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("integration_registries").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: null, action: `platform.integration.${data.status}`, entityType: "integration_registry", entityId: data.id });
    return { ok: true };
  });

export const listAllCompanyIntegrations = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .validator((d: unknown) => z.object({ search: z.string().optional(), status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("company_integrations").select("*, integration_registries(id, name, provider, category), companies(id, name)").order("created_at", { ascending: false }).limit(200);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listIntegrationLogs = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid().optional(), category: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("integration_logs").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAllApiKeys = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("api_keys").select("id, company_id, name, key_prefix, status, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllWebhooks = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("webhooks").select("id, company_id, name, url, status, is_enabled, last_delivered_at, last_error, created_at").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllOAuthConnections = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("oauth_connections").select("id, company_id, provider, status, scopes, connected_at, disconnected_at, created_at").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
