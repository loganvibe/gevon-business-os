/**
 * Intelligence server functions — Milestone 9.
 * All are authenticated, Zod-validated, RLS-scoped and audit-logged.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { buildSnapshot, resolvePeriod, type Sb } from "./datasource";
import { computeKpis } from "../engine/kpi";
import { calculateHealthScore } from "../engine/health";
import { generateAlerts, generateRecommendations } from "../engine/advisor";
import { autoForecast, densifyDaily } from "../engine/forecast";
import { emitEvent } from "./events";

const periodEnum = z.enum(["daily", "weekly", "monthly", "yearly", "custom"]);

const scopeSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  period: periodEnum.default("monthly"),
  from: z.string().optional(),
  to: z.string().optional(),
});

/** Executive dashboard + business health + advisor in one read-only call. */
export const dashboardOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => scopeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as Sb;
    const { start, end } = resolvePeriod(data.period, data.from, data.to);
    const snapshot = await buildSnapshot(supabase, {
      companyId: data.companyId,
      branchId: data.branchId ?? null,
      start,
      end,
    });
    const kpis = computeKpis(snapshot);
    const health = calculateHealthScore(snapshot);
    const recommendations = generateRecommendations(snapshot);
    const alerts = generateAlerts(snapshot);
    const salesForecast = autoForecast(densifyDaily(snapshot.sales.dailySeries, start, end), 30);

    return {
      period: { start, end, kind: data.period },
      currency: snapshot.currency,
      kpis,
      health,
      recommendations,
      alerts,
      salesForecast,
      snapshot,
    };
  });

/** Persists KPIs, health score, recommendations and alerts, and emits events. */
export const refreshIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => scopeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as Sb;
    const { start, end } = resolvePeriod(data.period, data.from, data.to);
    const branchId = data.branchId ?? null;
    const snapshot = await buildSnapshot(supabase, {
      companyId: data.companyId,
      branchId,
      start,
      end,
    });

    const kpis = computeKpis(snapshot);
    const health = calculateHealthScore(snapshot);
    const recommendations = generateRecommendations(snapshot);
    const alerts = generateAlerts(snapshot);

    // ---- KPIs -----------------------------------------------------------
    await supabase.from("kpis").upsert(
      kpis.map((k) => ({
        company_id: data.companyId,
        branch_id: branchId,
        kpi_key: k.key,
        label: k.label,
        unit: k.unit,
        period: data.period,
        period_start: start,
        period_end: end,
        value: k.value,
        previous_value: k.previousValue,
        change_percent: k.changePercent,
        trend: k.trend,
        meta: (k.meta ?? {}) as never,
        computed_at: new Date().toISOString(),
      })) as never,
      { onConflict: "company_id,branch_id,kpi_key,period,period_start" },
    );

    // ---- Health score ---------------------------------------------------
    const { data: healthRow } = await supabase
      .from("business_health_scores")
      .insert({
        company_id: data.companyId,
        branch_id: branchId,
        overall_score: health.overallScore,
        grade: health.grade,
        areas: health.areas as never,
        factors: health.factors as never,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();

    // ---- Recommendations -------------------------------------------------
    if (recommendations.length) {
      await supabase.from("advisor_recommendations").upsert(
        recommendations.map((r) => ({
          company_id: data.companyId,
          branch_id: branchId,
          rule_key: r.ruleKey,
          module_id: r.moduleId,
          title: r.title,
          finding: r.finding,
          recommendation: r.recommendation,
          impact: r.impact,
          confidence: r.confidence,
          severity: r.severity,
          data: r.data as never,
          dedupe_key: r.dedupeKey,
          generated_at: new Date().toISOString(),
        })) as never,
        { onConflict: "company_id,dedupe_key", ignoreDuplicates: true },
      );
    }

    // ---- Alerts ----------------------------------------------------------
    if (alerts.length) {
      await supabase.from("alerts").upsert(
        alerts.map((a) => ({
          company_id: data.companyId,
          branch_id: branchId,
          alert_key: a.alertKey,
          module_id: a.moduleId,
          severity: a.severity,
          title: a.title,
          message: a.message,
          deep_link: a.deepLink ?? null,
          data: a.data as never,
          dedupe_key: a.dedupeKey,
        })) as never,
        { onConflict: "company_id,dedupe_key", ignoreDuplicates: true },
      );
    }

    await emitEvent(supabase, context.userId, "health.updated", data.companyId, {
      companyId: data.companyId,
      score: health.overallScore,
      grade: health.grade,
    });
    for (const r of recommendations) {
      await emitEvent(supabase, context.userId, "advisor.recommendation.created", data.companyId, {
        companyId: data.companyId,
        ruleKey: r.ruleKey,
        title: r.title,
        impact: r.impact,
      });
    }
    for (const a of alerts) {
      await emitEvent(supabase, context.userId, "alert.created", data.companyId, {
        companyId: data.companyId,
        alertKey: a.alertKey,
        severity: a.severity,
        title: a.title,
      });
    }

    await writeAudit(context, {
      companyId: data.companyId,
      action: "intelligence.refresh",
      entityType: "public.business_health_scores",
      entityId: healthRow?.id ?? null,
      after: { score: health.overallScore, kpis: kpis.length, alerts: alerts.length },
    });

    return {
      healthScoreId: healthRow?.id ?? null,
      kpiCount: kpis.length,
      recommendationCount: recommendations.length,
      alertCount: alerts.length,
      health,
    };
  });
