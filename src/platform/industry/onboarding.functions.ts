import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getIndustryProfile, getAllIndustryProfiles } from "@/platform/industry/profiles";
import { writeAudit } from "@/platform/audit.helpers";

export const listIndustryProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async () => {
    return getAllIndustryProfiles().map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      icon: p.icon,
      recommendedModules: p.recommendedModules,
      recommendedWidgets: p.recommendedWidgets,
      relevantKpis: p.relevantKpis,
    }));
  });

export const getIndustryProfileDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const profile = getIndustryProfile(data.key);
    if (!profile) throw new Error("Industry profile not found");
    return profile;
  });

export const getOnboardingState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: state, error } = await supabase.from("onboarding_states").select("*").eq("company_id", data.companyId).maybeSingle();
    if (error) throw new Error(error.message);
    return state ?? { companyId: data.companyId, currentStep: "business_name", completedSteps: [], data: {} };
  });

export const updateOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      step: z.string().min(1),
      completed: z.boolean().default(true),
      data: z.record(z.string(), z.unknown()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing } = await supabase.from("onboarding_states").select("*").eq("company_id", data.companyId).maybeSingle();
    const completedSteps = existing
      ? [...new Set([...existing.completed_steps, ...(data.completed ? [data.step] : [])])]
      : data.completed ? [data.step] : [];
    const currentStep = data.completed ? getNextStep(data.step) : data.step;
    const mergedData = { ...(existing?.data ?? {}), ...data.data };
    const { data: state, error } = await supabase
      .from("onboarding_states")
      .upsert({
        company_id: data.companyId,
        current_step: currentStep,
        completed_steps: completedSteps,
        data: mergedData,
        completed_at: currentStep === "complete" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "onboarding.step_updated", entityType: "onboarding", entityId: state.id });
    return state;
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      industryKey: z.string().min(1),
      businessSize: z.string().optional(),
      primaryOperations: z.array(z.string()).default([]),
      selectedModules: z.array(z.string()).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const profile = getIndustryProfile(data.industryKey);
    if (!profile) throw new Error("Invalid industry profile");
    const { error: updErr } = await supabase
      .from("company_profiles")
      .upsert({
        company_id: data.companyId,
        industry_key: data.industryKey,
        business_size: data.businessSize,
        primary_operations: data.primaryOperations,
        onboarding_status: "completed",
        onboarding_completed_at: new Date().toISOString(),
        dashboard_config: { widgets: profile.recommendedWidgets },
      });
    if (updErr) throw new Error(updErr.message);
    await supabase.from("onboarding_states").update({ current_step: "complete", completed_steps: ["business_name", "business_type", "branch", "business_size", "operations", "capabilities", "workspace", "import", "complete"], completed_at: new Date().toISOString() }).eq("company_id", data.companyId);
    await writeAudit(context, { companyId: data.companyId, action: "onboarding.completed", entityType: "company_profile", entityId: data.companyId, after: { industry: data.industryKey, modules: data.selectedModules } });
    return { ok: true, profile };
  });

export const getCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: profile, error } = await supabase.from("company_profiles").select("*").eq("company_id", data.companyId).maybeSingle();
    if (error) throw new Error(error.message);
    return profile;
  });

export const updateCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      industryKey: z.string().optional(),
      businessSize: z.string().optional(),
      primaryOperations: z.array(z.string()).optional(),
      dashboardConfig: z.record(z.string(), z.unknown()).optional(),
      customization: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const updates: Record<string, unknown> = {};
    if (data.industryKey) updates.industry_key = data.industryKey;
    if (data.businessSize) updates.business_size = data.businessSize;
    if (data.primaryOperations) updates.primary_operations = data.primaryOperations;
    if (data.dashboardConfig) updates.dashboard_config = data.dashboardConfig;
    if (data.customization) updates.customization = data.customization;
    const { data: row, error } = await supabase.from("company_profiles").update(updates).eq("company_id", data.companyId).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "company.profile.updated", entityType: "company_profile", entityId: row.id });
    return row;
  });

export const getRecommendedModules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: profile } = await supabase.from("company_profiles").select("industry_key, business_size").eq("company_id", data.companyId).maybeSingle();
    if (!profile) return [];
    const industry = getIndustryProfile(profile.industry_key as string);
    if (!industry) return [];
    const { data: enabled } = await supabase.from("company_modules").select("module_id").eq("company_id", data.companyId);
    const enabledIds = new Set((enabled ?? []).map((r: any) => r.module_id));
    return industry.recommendedModules
      .filter((m) => !enabledIds.has(m))
      .map((moduleId) => ({
        moduleId,
        name: moduleId,
        reason: `Recommended for ${industry.name}`,
        priority: "recommended" as const,
        category: "industry",
      }));
  });

function getNextStep(current: string): string {
  const steps = ["business_name", "business_type", "branch", "business_size", "operations", "capabilities", "workspace", "import", "complete"];
  const idx = steps.indexOf(current);
  if (idx >= steps.length - 1) return "complete";
  return steps[idx + 1];
}
