/**
 * Platform-admin server functions (Gevon Admin Portal, /admin/*).
 * Every call runs behind `requirePlatformAdmin`; sensitive mutations
 * require `super_admin`.
 *
 * These functions never return raw company row data — only counts,
 * metadata, and platform-level state. Support-session-based deep-read
 * access is deferred to a later milestone.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  requirePlatformAdmin,
  requirePlatformRole,
} from "@/integrations/platform/admin-middleware";
import { allModules, hashManifest } from "@/platform/registry";
import { writeAudit } from "@/platform/audit.helpers";

// ============================================================
// Dashboard summary
// ============================================================
export const adminSummary = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [companies, admins, modules, flags, subs] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("platform_admins").select("id", { count: "exact", head: true }),
      supabase.from("modules").select("id", { count: "exact", head: true }),
      supabase.from("feature_flags").select("key", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id, status"),
    ]);
    const subsBreakdown = { trial: 0, active: 0, past_due: 0, cancelled: 0 } as Record<string, number>;
    for (const s of (subs.data ?? []) as any[]) subsBreakdown[s.status] = (subsBreakdown[s.status] ?? 0) + 1;
    return {
      companies: companies.count ?? 0,
      platformAdmins: admins.count ?? 0,
      modules: modules.count ?? 0,
      featureFlags: flags.count ?? 0,
      subscriptions: subsBreakdown,
    };
  });

// ============================================================
// Companies — metadata only (no row data)
// ============================================================
export const listAllCompanies = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("companies")
      .select("id, name, slug, country_code, currency_code, status, is_internal, created_at, subscriptions(plan_key, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setCompanyStatus = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "operations", "support"])])
  .inputValidator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), status: z.enum(["active", "suspended", "archived"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("companies").update({ status: data.status }).eq("id", data.companyId);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId, action: `platform.company.${data.status}`,
      entityType: "platform.company", entityId: data.companyId,
    });
    return { ok: true };
  });

// ============================================================
// Platform admins CRUD
// ============================================================
export const listPlatformAdmins = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("platform_admins")
      .select("id, user_id, role, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Enrich with email via admin API.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const enriched = await Promise.all(
      (data ?? []).map(async (row: any) => {
        try {
          const { data: u } = await (supabaseAdmin as any).auth.admin.getUserById(row.user_id);
          return { ...row, email: u?.user?.email ?? null };
        } catch { return { ...row, email: null }; }
      }),
    );
    return enriched;
  });

const grantInput = z.object({
  email: z.string().email(),
  role: z.enum([
    "super_admin","support","developer","operations","finance","compliance","security","billing",
  ]),
});
export const grantPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole("super_admin")])
  .inputValidator((d: unknown) => grantInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await (supabaseAdmin as any).auth.admin.listUsers();
    if (error) throw new Error(error.message);
    const user = list?.users?.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) throw new Error("No user found with that email — ask them to sign up first.");
    const { error: insErr } = await (supabaseAdmin as any).from("platform_admins").insert({
      user_id: user.id, role: data.role, created_by: context.userId, status: "active",
    });
    if (insErr) throw new Error(insErr.message);
    await writeAudit(context, {
      companyId: null, action: "platform.admin.granted", entityType: "platform_admin",
      entityId: null, after: { email: data.email, role: data.role },
    });
    return { ok: true };
  });

export const revokePlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole("super_admin")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("platform_admins").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null, action: "platform.admin.revoked", entityType: "platform_admin", entityId: data.id,
    });
    return { ok: true };
  });

// ============================================================
// Modules — admin-side
// ============================================================
export const adminListModules = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("modules")
      .select("*, module_dependencies!module_dependencies_module_id_fkey(depends_on_id), plan_modules(plan_key)")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setModuleGlobalStatus = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "operations"])])
  .inputValidator((d: unknown) =>
    z.object({ moduleId: z.string(), status: z.enum(["active", "deprecated", "disabled_global"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("modules").update({ status: data.status }).eq("id", data.moduleId);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null, action: `platform.module.${data.status}`,
      entityType: "platform.module", entityId: null, after: { module_id: data.moduleId },
    });
    return { ok: true };
  });

export const syncManifests = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole("super_admin")])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const inserted: string[] = []; const updated: string[] = [];
    for (const m of allModules()) {
      const hash = await hashManifest(m);
      const { data: existing } = await admin.from("modules").select("id, manifest_hash").eq("id", m.id).maybeSingle();
      const row = {
        id: m.id, name: m.name, description: m.description, category: m.category, icon: m.icon,
        version: m.version, subscription_tier: m.subscriptionTier, is_core: m.isCore,
        manifest_hash: hash,
      };
      if (!existing) {
        await admin.from("modules").insert(row);
        inserted.push(m.id);
      } else if (existing.manifest_hash !== hash) {
        await admin.from("modules").update(row).eq("id", m.id);
        updated.push(m.id);
      }
      // Sync dependencies (idempotent replace)
      await admin.from("module_dependencies").delete().eq("module_id", m.id);
      if (m.dependencies.length) {
        await admin.from("module_dependencies").insert(m.dependencies.map((d) => ({ module_id: m.id, depends_on_id: d })));
      }
      // Sync permissions
      for (const p of m.permissions) {
        await admin.from("permissions").upsert({ key: p.key, module: m.id, description: p.description });
        await admin.from("module_permissions").upsert({ module_id: m.id, permission_key: p.key });
      }
      // Sync AI capabilities
      for (const c of m.aiCapabilities) {
        await admin.from("module_ai_capabilities").upsert(
          {
            module_id: m.id, key: c.key, name: c.name, description: c.description ?? null,
            input_schema: c.inputSchema ?? {}, output_schema: c.outputSchema ?? {},
          },
          { onConflict: "module_id,key" },
        );
      }
      // Sync feature flags
      for (const f of m.featureFlags) {
        await admin.from("feature_flags").upsert({
          key: f.key, module_id: m.id, name: f.name, description: f.description ?? null,
          default_status: f.defaultStatus,
        });
      }
    }
    await writeAudit(context, {
      companyId: null, action: "platform.modules.synced",
      entityType: "platform.registry", entityId: null,
      after: { inserted, updated },
    });
    return { inserted, updated, total: allModules().length };
  });

// ============================================================
// Feature flags — admin
// ============================================================
export const adminListFlags = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: flags }, { data: overrides }] = await Promise.all([
      supabase.from("feature_flags").select("*").order("key"),
      supabase.from("feature_flag_overrides").select("*"),
    ]);
    return { flags: flags ?? [], overrides: overrides ?? [] };
  });

const flagOvInput = z.object({
  flagKey: z.string(),
  companyId: z.string().uuid().nullable(),
  status: z.enum(["development","internal","beta","premium","public","disabled"]),
  note: z.string().optional(),
});
export const setFlagOverride = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .inputValidator((d: unknown) => flagOvInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Try update-then-insert (upsert would need matching unique index shape).
    const existing = await supabase.from("feature_flag_overrides").select("id")
      .eq("flag_key", data.flagKey)
      .is("company_id", data.companyId === null ? true : (undefined as any))
      .maybeSingle();
    // Use conditional query because .is('company_id', null) vs .eq()
    let query = supabase.from("feature_flag_overrides").select("id").eq("flag_key", data.flagKey);
    query = data.companyId === null ? query.is("company_id", null) : query.eq("company_id", data.companyId);
    const { data: found } = await query.maybeSingle();
    if (found?.id) {
      await supabase.from("feature_flag_overrides")
        .update({ status: data.status, note: data.note ?? null, set_by: userId })
        .eq("id", found.id);
    } else {
      await supabase.from("feature_flag_overrides").insert({
        flag_key: data.flagKey, company_id: data.companyId, status: data.status, note: data.note ?? null, set_by: userId,
      });
    }
    await writeAudit(context, {
      companyId: data.companyId, action: "platform.flag.override_set",
      entityType: "feature_flag_override", entityId: null,
      after: { flag: data.flagKey, status: data.status },
    });
    void existing;
    return { ok: true };
  });

export const deleteFlagOverride = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("feature_flag_overrides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null, action: "platform.flag.override_cleared",
      entityType: "feature_flag_override", entityId: data.id,
    });
    return { ok: true };
  });

// ============================================================
// Subscriptions — admin
// ============================================================
export const adminListSubscriptions = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, companies(id, name), plans(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const setPlanInput = z.object({
  companyId: z.string().uuid(),
  planKey: z.enum(["starter", "professional", "enterprise", "custom"]),
  extendTrialDays: z.number().int().min(0).max(365).optional(),
});
export const setCompanyPlan = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "finance", "billing"])])
  .inputValidator((d: unknown) => setPlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = { plan_key: data.planKey };
    if (data.extendTrialDays) {
      patch.trial_ends_at = new Date(Date.now() + data.extendTrialDays * 86_400_000).toISOString();
      patch.status = "trial";
    }
    const { data: existing } = await supabase.from("subscriptions").select("id").eq("company_id", data.companyId).maybeSingle();
    if (existing?.id) {
      const { error } = await supabase.from("subscriptions").update(patch).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("subscriptions").insert({ company_id: data.companyId, ...patch });
      if (error) throw new Error(error.message);
    }
    await writeAudit(context, {
      companyId: data.companyId, action: "platform.subscription.updated",
      entityType: "subscription", entityId: null, after: patch,
    });
    return { ok: true };
  });

// ============================================================
// Global audit
// ============================================================
export const adminAuditLog = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole([
    "super_admin", "compliance", "security", "operations", "support",
  ])])
  .inputValidator((d: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(500).default(100),
      companyId: z.string().uuid().optional(),
      action: z.string().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    void context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any).schema("audit").from("audit_logs")
      .select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    if (data.action) q = q.ilike("action", `%${data.action}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
