/**
 * Customer-side platform server functions.
 * Called from the Business Portal (`/app/*`). All require a company member.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  allModules,
  findDependents,
  getModule,
  type NavItem,
} from "@/platform/registry";
import {
  evaluateAll,
  type EvaluatorContext,
  type FlagInput,
  type FlagStatus,
} from "@/platform/flags-evaluator";
import { writeAudit } from "@/platform/audit.helpers";

// ---------------- Context resolver: company evaluator ctx ----------------
async function resolveEvaluatorContext(
  supabase: any,
  userId: string,
  companyId: string,
): Promise<EvaluatorContext> {
  const [{ data: pa }, { data: company }, { data: sub }] = await Promise.all([
    supabase.from("platform_admins").select("id").eq("user_id", userId).eq("status", "active").maybeSingle(),
    supabase.from("companies").select("is_internal").eq("id", companyId).maybeSingle(),
    supabase.from("subscriptions").select("plan_key").eq("company_id", companyId).maybeSingle(),
  ]);
  const planKey = sub?.plan_key ?? "starter";
  const planTier = { starter: 0, professional: 1, enterprise: 2, custom: 3 }[planKey as string] ?? 0;
  return {
    isPlatformAdmin: !!pa,
    isCompanyInternal: !!company?.is_internal,
    planTier,
  };
}

async function resolveUserPermissions(
  supabase: any,
  userId: string,
  companyId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("company_members")
    .select("id, member_roles(role_id, roles(role_permissions(permission_key)))")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  const perms = new Set<string>();
  const roles = (data as any)?.member_roles ?? [];
  for (const mr of roles) {
    for (const rp of mr.roles?.role_permissions ?? []) {
      perms.add(rp.permission_key);
    }
  }
  return perms;
}

// ============================================================
// Modules — customer side
// ============================================================
const companyIdInput = z.object({ companyId: z.string().uuid() });

export const listAvailableModules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => companyIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: modulesRows }, { data: enabled }, { data: sub }, { data: planMods }] = await Promise.all([
      supabase.from("modules").select("*").eq("status", "active"),
      supabase.from("company_modules").select("module_id").eq("company_id", data.companyId),
      supabase.from("subscriptions").select("plan_key").eq("company_id", data.companyId).maybeSingle(),
      supabase.from("plan_modules").select("module_id, plan_key"),
    ]);
    const planKey = sub?.plan_key ?? "starter";
    const allowedIds = new Set((planMods ?? []).filter((r: any) => r.plan_key === planKey).map((r: any) => r.module_id));
    const enabledIds = new Set((enabled ?? []).map((r: any) => r.module_id));
    return (modulesRows ?? []).map((m: any) => ({
      ...m,
      inPlan: allowedIds.has(m.id),
      enabled: enabledIds.has(m.id),
      manifest: getModule(m.id) ?? null,
    }));
  });

const moduleActionInput = z.object({
  companyId: z.string().uuid(),
  moduleId: z.string().min(1),
});

export const enableModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => moduleActionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const manifest = getModule(data.moduleId);
    if (!manifest) throw new Error("Unknown module");

    // Plan check
    const { data: sub } = await supabase.from("subscriptions").select("plan_key").eq("company_id", data.companyId).maybeSingle();
    const planKey = sub?.plan_key ?? "starter";
    const { data: planMod } = await supabase
      .from("plan_modules").select("module_id").eq("plan_key", planKey).eq("module_id", data.moduleId).maybeSingle();
    if (!planMod) throw new Error(`Your current plan (${planKey}) does not include ${manifest.name}`);

    // Dependency check
    const { data: enabled } = await supabase.from("company_modules").select("module_id").eq("company_id", data.companyId);
    const enabledSet = new Set((enabled ?? []).map((r: any) => r.module_id));
    const missing = manifest.dependencies.filter((d) => !enabledSet.has(d));
    if (missing.length) throw new Error(`Missing required modules: ${missing.join(", ")}`);

    const { error } = await supabase.from("company_modules").insert({
      company_id: data.companyId,
      module_id: data.moduleId,
      enabled_by: userId,
    });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId, action: "module.enabled",
      entityType: "company_module", entityId: null, after: { module_id: data.moduleId },
    });
    return { ok: true };
  });

export const disableModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => moduleActionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const m = getModule(data.moduleId);
    if (m?.isCore) throw new Error("Core modules cannot be disabled");

    const { data: enabled } = await supabase.from("company_modules").select("module_id").eq("company_id", data.companyId);
    const enabledIds = (enabled ?? []).map((r: any) => r.module_id);
    const dependents = findDependents(data.moduleId, enabledIds);
    if (dependents.length) {
      throw new Error(`Disable these first: ${dependents.join(", ")}`);
    }
    const { error } = await supabase.from("company_modules")
      .delete().eq("company_id", data.companyId).eq("module_id", data.moduleId);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId, action: "module.disabled",
      entityType: "company_module", entityId: null, after: { module_id: data.moduleId },
    });
    return { ok: true };
  });

// ============================================================
// Feature flags — customer evaluation
// ============================================================
const evalInput = z.object({
  companyId: z.string().uuid(),
  keys: z.array(z.string()).optional(),
});

export const evaluateFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => evalInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: defs }, { data: overrides }] = await Promise.all([
      data.keys?.length
        ? supabase.from("feature_flags").select("*").in("key", data.keys)
        : supabase.from("feature_flags").select("*"),
      supabase.from("feature_flag_overrides").select("*")
        .or(`company_id.is.null,company_id.eq.${data.companyId}`),
    ]);
    const ctx = await resolveEvaluatorContext(supabase, userId, data.companyId);
    const inputs: FlagInput[] = (defs ?? []).map((f: any) => {
      const globalOv = (overrides ?? []).find((o: any) => o.flag_key === f.key && o.company_id === null);
      const companyOv = (overrides ?? []).find((o: any) => o.flag_key === f.key && o.company_id === data.companyId);
      return {
        key: f.key,
        defaultStatus: f.default_status as FlagStatus,
        globalOverride: (globalOv?.status ?? null) as FlagStatus | null,
        companyOverride: (companyOv?.status ?? null) as FlagStatus | null,
      };
    });
    return evaluateAll(inputs, ctx);
  });

// ============================================================
// Subscription — customer read
// ============================================================
export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => companyIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: sub }, { data: modules }] = await Promise.all([
      supabase.from("subscriptions").select("*, plans(*)").eq("company_id", data.companyId).maybeSingle(),
      supabase.from("plan_modules").select("plan_key, module_id, modules(id, name, description, category, icon)"),
    ]);
    return {
      subscription: sub,
      includedModules: (modules ?? [])
        .filter((r: any) => r.plan_key === sub?.plan_key)
        .map((r: any) => r.modules),
    };
  });

// ============================================================
// Dynamic navigation
// ============================================================
export const getNavigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => companyIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }] = await Promise.all([
      supabase.from("company_profiles").select("industry_key").eq("company_id", data.companyId).maybeSingle(),
    ]);
    const industry = (profile as any)?.industry_key as string | undefined;
    const [enabledRes, permsSet, flagEval] = await Promise.all([
      supabase.from("company_modules").select("module_id").eq("company_id", data.companyId),
      resolveUserPermissions(supabase, userId, data.companyId),
      (async () => {
        const [{ data: defs }, { data: overrides }] = await Promise.all([
          supabase.from("feature_flags").select("*"),
          supabase.from("feature_flag_overrides").select("*")
            .or(`company_id.is.null,company_id.eq.${data.companyId}`),
        ]);
        const ctx = await resolveEvaluatorContext(supabase, userId, data.companyId);
        const inputs: FlagInput[] = (defs ?? []).map((f: any) => {
          const globalOv = (overrides ?? []).find((o: any) => o.flag_key === f.key && o.company_id === null);
          const companyOv = (overrides ?? []).find((o: any) => o.flag_key === f.key && o.company_id === data.companyId);
          return {
            key: f.key,
            defaultStatus: f.default_status as FlagStatus,
            globalOverride: (globalOv?.status ?? null) as FlagStatus | null,
            companyOverride: (companyOv?.status ?? null) as FlagStatus | null,
          };
        });
        return evaluateAll(inputs, ctx);
      })(),
    ]);
    const enabledIds = new Set(((enabledRes as any).data ?? []).map((r: any) => r.module_id));

    function filterItems(items: NavItem[]): NavItem[] {
      return items
        .filter((it) => (!it.permission || permsSet.has(it.permission)))
        .filter((it) => (!it.flag || flagEval[it.flag]?.enabled))
        .map((it) => ({
          ...it,
          children: it.children ? filterItems(it.children) : undefined,
        }));
    }

    const groups = allModules()
      .filter((m) => enabledIds.has(m.id))
      .filter((m) => !industry || isModuleRelevantToIndustry(m.id, industry))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({
        moduleId: m.id,
        moduleName: m.name,
        items: filterItems(m.navigation),
      }))
      .filter((g) => g.items.length > 0);

    return { groups };
  });

function isModuleRelevantToIndustry(moduleId: string, industryKey: string): boolean {
  const industryModules: Record<string, string[]> = {
    retail: ["sales", "inventory", "commerce", "crm", "expenses", "reports"],
    restaurant: ["sales", "inventory", "commerce", "crm", "expenses", "reports"],
    pharmacy: ["sales", "inventory", "crm", "expenses", "reports"],
    wholesale: ["sales", "inventory", "enterprise", "crm", "expenses", "reports"],
    construction: ["enterprise", "inventory", "expenses", "workflow", "reports"],
    manufacturing: ["inventory", "enterprise", "sales", "expenses", "reports"],
    service: ["sales", "crm", "workflow", "people", "expenses", "reports"],
    hospitality: ["commerce", "crm", "inventory", "expenses", "reports"],
    education: ["people", "crm", "expenses", "reports"],
    agriculture: ["inventory", "sales", "enterprise", "expenses", "reports"],
  };
  const relevant = industryModules[industryKey] ?? [];
  if (relevant.includes(moduleId)) return true;
  return ["core"].includes(moduleId);
}
