/**
 * Gevon AI Platform — Server Functions
 * -------------------------------------
 * executeAICapability: the single entry point for all AI calls.
 * Admin functions to configure models per capability.
 * Usage/credit query functions.
 * Credit adjustment functions.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformRole } from "@/integrations/platform/admin-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { createOpenRouterProvider } from "./ai/provider";
import { getEffectiveConfig } from "./ai/config";
import { getModelPricing, computeProviderCost } from "./ai/pricing";
import { checkCredits, deductCredits } from "./ai/wallet";
import { logAIUsage, computeCredits } from "./ai/credits";

// ============================================================
// Prompt templates (capability key -> prompt builder)
// ============================================================
function buildPrompt(capabilityKey: string, payload: Record<string, unknown>): string {
  const context = JSON.stringify(payload, null, 2);
  switch (capabilityKey) {
    case "sales.sales_forecast":
      return `You are a sales forecasting assistant. Analyze the following business data and provide a sales forecast.\n\nData:\n${context}\n\nProvide a structured forecast with confidence intervals and key assumptions.`;
    case "sales.customer_purchase_patterns":
      return `You are a customer analytics assistant. Analyze the following data to identify recurring purchase patterns.\n\nData:\n${context}\n\nIdentify top patterns, customer segments, and actionable insights.`;
    case "sales.product_recommendations":
      return `You are a product recommendation engine. Based on the following sales history, recommend products.\n\nData:\n${context}\n\nReturn a ranked list of recommendations with reasoning.`;
    case "sales.sales_trend_analysis":
      return `You are a sales analyst. Explain the trends and anomalies in the following sales data.\n\nData:\n${context}\n\nHighlight key trends, outliers, and possible causes.`;
    case "inventory.inventory_prediction":
      return `You are an inventory planning assistant. Predict future inventory needs based on the following data.\n\nData:\n${context}\n\nProvide predictions with confidence levels and recommended reorder points.`;
    case "inventory.low_stock_analysis":
      return `You are an inventory analyst. Identify low-stock risks from the following data.\n\nData:\n${context}\n\nList at-risk items, impact assessment, and recommended actions.`;
    case "inventory.product_profit_analysis":
      return `You are a product profitability analyst. Analyze profit margins from the following data.\n\nData:\n${context}\n\nIdentify top and bottom performers, and suggest pricing or sourcing improvements.`;
    case "inventory.supplier_analysis":
      return `You are a supplier performance analyst. Evaluate suppliers from the following data.\n\nData:\n${context}\n\nRate suppliers on reliability, cost, and delivery performance.`;
    case "expenses.spend_analysis":
      return `You are an expense analyst. Analyze spending patterns from the following data.\n\nData:\n${context}\n\nIdentify major cost drivers, trends, and anomalies.`;
    case "expenses.cost_reduction":
      return `You are a cost-reduction consultant. Suggest ways to reduce costs based on the following data.\n\nData:\n${context}\n\nProvide prioritized, actionable cost-saving recommendations.`;
    case "expenses.cashflow_forecast":
      return `You are a cashflow forecaster. Predict cashflow based on the following data.\n\nData:\n${context}\n\nProvide a cashflow forecast with risks and recommendations.`;
    case "people.attendance_insights":
      return `You are an HR analytics assistant. Analyze attendance patterns from the following data.\n\nData:\n${context}\n\nIdentify absenteeism trends, patterns, and recommendations.`;
    case "people.shift_optimization":
      return `You are a workforce scheduling assistant. Suggest shift optimizations based on the following data.\n\nData:\n${context}\n\nPropose optimized schedules with rationale.`;
    case "people.payroll_review":
      return `You are a payroll analyst. Review payroll data for anomalies and insights.\n\nData:\n${context}\n\nFlag anomalies, trends, and recommendations.`;
    case "people.candidate_screening":
      return `You are a recruitment assistant. Screen candidates based on the following criteria.\n\nData:\n${context}\n\nProvide a shortlist with fit scores and reasoning.`;
    case "workflow.workflow_suggestions":
      return `You are a workflow optimization consultant. Suggest workflow improvements based on the following data.\n\nData:\n${context}\n\nPropose optimized workflows with expected impact.`;
    case "workflow.task_prioritization":
      return `You are a task management assistant. Prioritize tasks based on the following data.\n\nData:\n${context}\n\nReturn a prioritized task list with rationale.`;
    case "workflow.approval_risk_analysis":
      return `You are a risk analyst. Assess approval risks from the following data.\n\nData:\n${context}\n\nFlag high-risk approvals with mitigation suggestions.`;
    case "workflow.automation_recommendations":
      return `You are an automation consultant. Recommend automation opportunities based on the following data.\n\nData:\n${context}\n\nList automatable processes with ROI estimates.`;
    case "commerce.commerce_sales_prediction":
      return `You are an e-commerce sales forecaster. Predict sales based on the following data.\n\nData:\n${context}\n\nProvide forecasts with confidence intervals and key drivers.`;
    case "commerce.product_recommendations":
      return `You are an e-commerce recommendation engine. Recommend products based on the following data.\n\nData:\n${context}\n\nReturn a ranked list with reasoning.`;
    case "commerce.order_demand_prediction":
      return `You are a demand forecaster. Predict order volumes from the following data.\n\nData:\n${context}\n\nProvide demand forecasts with seasonal adjustments.`;
    case "commerce.customer_purchase_recommendations":
      return `You are a customer recommendation assistant. Suggest next purchases based on the following data.\n\nData:\n${context}\n\nReturn personalized recommendations with reasoning.`;
    case "commerce.delivery_time_prediction":
      return `You are a logistics analyst. Predict delivery times based on the following data.\n\nData:\n${context}\n\nProvide delivery time estimates with confidence levels.`;
    case "enterprise.branch_performance_analysis":
      return `You are a business performance analyst. Analyze branch performance from the following data.\n\nData:\n${context}\n\nRank branches, identify top/bottom performers, and suggest improvements.`;
    case "enterprise.supplier_risk_analysis":
      return `You are a supplier risk analyst. Assess supplier risks from the following data.\n\nData:\n${context}\n\nRate suppliers by risk level and suggest mitigation strategies.`;
    case "enterprise.procurement_optimization":
      return `You are a procurement optimizer. Suggest procurement improvements based on the following data.\n\nData:\n${context}\n\nProvide cost-saving and efficiency recommendations.`;
    case "enterprise.asset_maintenance_prediction":
      return `You are an asset maintenance predictor. Predict maintenance needs from the following data.\n\nData:\n${context}\n\nProvide maintenance schedules with priority and cost estimates.`;
    case "enterprise.fleet_cost_analysis":
      return `You are a fleet cost analyst. Analyze fleet costs from the following data.\n\nData:\n${context}\n\nIdentify cost drivers and savings opportunities.`;
    case "enterprise.warehouse_optimization":
      return `You are a warehouse optimization consultant. Suggest layout and process improvements.\n\nData:\n${context}\n\nPropose optimizations with expected efficiency gains.`;
    case "integration.integration_error_analysis":
      return `You are an integration support analyst. Diagnose integration errors from the following data.\n\nData:\n${context}\n\nIdentify root causes and suggest fixes.`;
    case "integration.data_import_mapping":
      return `You are a data integration specialist. Suggest field mappings for the following import data.\n\nData:\n${context}\n\nPropose mappings with confidence scores.`;
    case "integration.sync_anomaly_detection":
      return `You are a data sync analyst. Detect anomalies in sync data.\n\nData:\n${context}\n\nFlag anomalies, possible causes, and remediation steps.`;
    case "integration.integration_recommendations":
      return `You are an integration architect. Recommend integration improvements based on the following data.\n\nData:\n${context}\n\nSuggest integrations with expected business value.`;
    case "core.summarize_audit":
      return `You are an audit summarization assistant. Summarize the following audit log entries.\n\nData:\n${context}\n\nProvide a concise summary with key findings and risk indicators.`;
    default:
      return `You are a business assistant for Gevon BusinessOS. Help with the following request.\n\nContext:\n${context}\n\nProvide a clear, actionable response.`;
  }
}

// ============================================================
// Customer-facing: execute an AI capability
// ============================================================
export const executeAICapability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      capabilityKey: z.string().min(1),
      payload: z.record(z.string(), z.unknown()).default({}),
      companyId: z.string().uuid().nullable().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const startTime = Date.now();

    if (!data.companyId) {
      throw new Error("companyId is required for AI requests");
    }

    const cfg = await getEffectiveConfig(admin, data.capabilityKey, data.companyId);
    if (!cfg.enabled) {
      throw new Error(`AI capability "${data.capabilityKey}" is currently disabled.`);
    }

    // Check subscription tier
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan_key, status, trial_ends_at")
      .eq("company_id", data.companyId)
      .maybeSingle();
    const planKey = sub?.plan_key ?? "starter";
    if (sub?.status === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
      throw new Error("Trial expired. Please upgrade your plan to continue using AI.");
    }

    // Starter plan requires ai_features flag
    if (planKey === "starter") {
      const { data: flag } = await admin
        .from("feature_flags")
        .select("default_status")
        .eq("key", "ai_features")
        .maybeSingle();
      if ((flag?.default_status ?? "disabled") === "disabled") {
        throw new Error("AI features require a Professional or Enterprise plan.");
      }
    }

    // Check credits
    const pricing = await getModelPricing(admin, cfg.provider, cfg.model);
    const estimatedCredits = computeCredits(pricing, {
      content: "",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: cfg.model,
      provider: cfg.provider,
    }, cfg.creditCostPer1kTokens);

    const creditCheck = await checkCredits(admin, data.companyId, estimatedCredits);
    if (!creditCheck.allowed) {
      throw new Error(creditCheck.reason ?? "Insufficient AI credits.");
    }

    // Call OpenRouter
    const provider = createOpenRouterProvider();
    const messages = [
      { role: "system" as const, content: buildPrompt(data.capabilityKey, data.payload) },
    ];

    if (Array.isArray((data.payload as any).messages)) {
      messages.push(...((data.payload as any).messages as any[]));
      delete (data.payload as any).messages;
    }

    let result;
    try {
      result = await provider.chat(messages, {
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
      });
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      await logAIUsage(admin, {
        companyId: data.companyId,
        capabilityKey: data.capabilityKey,
        provider: cfg.provider,
        model: cfg.model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        providerCostUsd: 0,
        creditsUsed: 0,
        userId: context.userId,
        status: "error",
        errorMessage: errorMsg,
        requestDurationMs: Date.now() - startTime,
      });
      throw new Error(`OpenRouter error: ${errorMsg}`);
    }

    const actualCredits = computeCredits(pricing, result, cfg.creditCostPer1kTokens);
    const providerCost = computeProviderCost(pricing, result.usage.promptTokens, result.usage.completionTokens);

    // Deduct credits
    await deductCredits(admin, data.companyId, actualCredits, result.usage.totalTokens);

    // Log usage
    await logAIUsage(admin, {
      companyId: data.companyId,
      capabilityKey: data.capabilityKey,
      provider: result.provider,
      model: result.model,
      inputTokens: result.usage.promptTokens,
      outputTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      providerCostUsd: providerCost,
      creditsUsed: actualCredits,
      userId: context.userId,
      status: "success",
      requestDurationMs: Date.now() - startTime,
    });

    return {
      content: result.content,
      usage: result.usage,
      model: result.model,
      provider: result.provider,
      credits: actualCredits,
      remainingCredits: creditCheck.remainingMonthly - actualCredits,
    };
  });

// ============================================================
// Admin: list AI capability configs
// ============================================================
export const listAICapabilityConfigs = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer"])])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("ai_capability_configs")
      .select("*")
      .order("capability_key");
    return data ?? [];
  });

// ============================================================
// Admin: update AI capability config
// ============================================================
const updateConfigInput = z.object({
  capabilityKey: z.string().min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
  enabled: z.boolean().optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  creditCostPer1kTokens: z.number().min(0).optional(),
});
export const setAICapabilityConfig = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .validator((d: unknown) => updateConfigInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.provider !== undefined) patch.provider = data.provider;
    if (data.model !== undefined) patch.model = data.model;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.maxTokens !== undefined) patch.max_tokens = data.maxTokens;
    if (data.temperature !== undefined) patch.temperature = data.temperature;
    if (data.creditCostPer1kTokens !== undefined) patch.credit_cost_per_1k_tokens = data.creditCostPer1kTokens;

    const { error } = await (supabaseAdmin as any)
      .from("ai_capability_configs")
      .upsert({ capability_key: data.capabilityKey, ...patch }, { onConflict: "capability_key" });

    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null, action: "platform.ai.config_updated",
      entityType: "ai_capability_config", entityId: null,
      after: { capabilityKey: data.capabilityKey, patch },
    });
    return { ok: true };
  });

// ============================================================
// Admin: list model pricing
// ============================================================
export const listModelPricing = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("ai_model_pricing")
      .select("*")
      .order("provider", { ascending: true })
      .order("model", { ascending: true });
    return data ?? [];
  });

// ============================================================
// Admin: update model pricing
// ============================================================
const updatePricingInput = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  inputPricePer1k: z.number().min(0),
  outputPricePer1k: z.number().min(0),
  isActive: z.boolean().optional(),
});
export const setModelPricing = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .validator((d: unknown) => updatePricingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("ai_model_pricing")
      .upsert({
        provider: data.provider,
        model: data.model,
        input_price_per_1k: data.inputPricePer1k,
        output_price_per_1k: data.outputPricePer1k,
        is_active: data.isActive ?? true,
      }, { onConflict: "provider,model" });
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null, action: "platform.ai.pricing_updated",
      entityType: "ai_model_pricing", entityId: null,
      after: { provider: data.provider, model: data.model, inputPricePer1k: data.inputPricePer1k, outputPricePer1k: data.outputPricePer1k },
    });
    return { ok: true };
  });

// ============================================================
// Admin: list plan AI limits
// ============================================================
export const listPlanAILimits = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("plan_ai_limits")
      .select("*")
      .order("plan_key");
    return data ?? [];
  });

// ============================================================
// Admin: update plan AI limits
// ============================================================
const updatePlanLimitInput = z.object({
  planKey: z.string().min(1),
  monthlyCredits: z.number().min(0),
  dailyLimit: z.number().int().min(0),
  trialCredits: z.number().min(0),
});
export const setPlanAILimit = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations"])])
  .validator((d: unknown) => updatePlanLimitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("plan_ai_limits")
      .upsert({
        plan_key: data.planKey,
        monthly_credits: data.monthlyCredits,
        daily_limit: data.dailyLimit,
        trial_credits: data.trialCredits,
      }, { onConflict: "plan_key" });
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null, action: "platform.ai.plan_limit_updated",
      entityType: "plan_ai_limits", entityId: null,
      after: data,
    });
    return { ok: true };
  });

// ============================================================
// Admin: list company AI credits
// ============================================================
export const listCompanyAICredits = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations", "support"])])
  .validator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("company_ai_credits")
      .select("*, companies(name, slug)")
      .order("updated_at", { ascending: false });
    return data ?? [];
  });

// ============================================================
// Admin: adjust company credits (bonus/remove)
// ============================================================
const adjustCreditsInput = z.object({
  companyId: z.string().uuid(),
  amount: z.number(), // positive = bonus, negative = remove
  reason: z.string().min(1),
});
export const adjustCompanyCredits = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations", "billing"])])
  .validator((d: unknown) => adjustCreditsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readErr } = await (supabaseAdmin as any)
      .from("company_ai_credits")
      .select("bonus_credits, monthly_credits")
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const prevBonus = Number(current?.bonus_credits ?? 0);
    const newBonus = prevBonus + data.amount;
    if (newBonus < 0) throw new Error("Bonus credits cannot go below zero.");

    const { error: updErr } = await (supabaseAdmin as any)
      .from("company_ai_credits")
      .upsert({
        company_id: data.companyId,
        bonus_credits: newBonus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" });
    if (updErr) throw new Error(updErr.message);

    await (supabaseAdmin as any).from("ai_credit_adjustments").insert({
      company_id: data.companyId,
      admin_user_id: context.userId,
      adjustment_type: data.amount > 0 ? "bonus" : "removal",
      amount: Math.abs(data.amount),
      previous_bonus_credits: prevBonus,
      new_bonus_credits: newBonus,
      reason: data.reason,
    });

    await writeAudit(context, {
      companyId: data.companyId,
      action: "platform.ai.credits_adjusted",
      entityType: "company_ai_credits",
      entityId: data.companyId,
      after: { amount: data.amount, reason: data.reason, newBonus },
    });
    return { ok: true, newBonus };
  });

// ============================================================
// Admin: AI usage analytics
// ============================================================
const usageAnalyticsInput = z.object({
  companyId: z.string().uuid().optional(),
  capabilityKey: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});
export const getAIUsageAnalytics = createServerFn({ method: "POST" })
  .middleware([requirePlatformRole(["super_admin", "developer", "operations", "support"])])
  .validator((d: unknown) => usageAnalyticsInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any)
      .from("ai_usage_logs")
      .select("company_id, capability_key, provider, model, input_tokens, output_tokens, total_tokens, credits_used, status, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    if (data.capabilityKey) q = q.eq("capability_key", data.capabilityKey);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// Customer: get my AI usage
// ============================================================
export const getMyAIUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      capabilityKey: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: wallet }, { data: usage }, { data: planLimits }] = await Promise.all([
      (supabaseAdmin as any).from("company_ai_credits").select("*").eq("company_id", data.companyId).maybeSingle(),
      (supabaseAdmin as any)
        .from("ai_usage_logs")
        .select("capability_key, provider, model, input_tokens, output_tokens, total_tokens, credits_used, status, created_at")
        .eq("company_id", data.companyId)
        .order("created_at", { ascending: false })
        .limit(data.limit),
      (supabaseAdmin as any).from("plan_ai_limits").select("*").eq("plan_key", (await (supabaseAdmin as any).from("subscriptions").select("plan_key").eq("company_id", data.companyId).maybeSingle())?.data?.plan_key ?? "starter").maybeSingle(),
    ]);

    const monthlyLimit = Number(planLimits?.monthly_credits ?? 0);
    const consumed = Number(wallet?.consumed_credits ?? 0);
    const bonus = Number(wallet?.bonus_credits ?? 0);
    const totalAvailable = monthlyLimit + bonus;
    const remaining = Math.max(0, totalAvailable - consumed);

    return {
      wallet: {
        monthlyLimit,
        bonusCredits: bonus,
        consumed,
        remaining,
        totalAvailable,
        periodStart: wallet?.period_start ?? null,
        periodEnd: wallet?.period_end ?? null,
      },
      usage: usage ?? [],
    };
  });
