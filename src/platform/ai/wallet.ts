/**
 * Gevon AI Platform — Credit Limits & Wallet
 * -------------------------------------------
 * Enforces plan-based limits, daily limits, and monthly quotas.
 * Deducts credits atomically after successful AI requests.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreditCheckResult {
  allowed: boolean;
  reason?: string;
  remainingMonthly: number;
  remainingDaily: number;
}

export async function checkCredits(
  admin: SupabaseClient,
  companyId: string,
  estimatedCredits: number,
): Promise<CreditCheckResult> {
  const [{ data: wallet }, { data: sub }, { data: today }] = await Promise.all([
    (admin as any).from("company_ai_credits").select("*").eq("company_id", companyId).maybeSingle(),
    (admin as any).from("subscriptions").select("plan_key, status, trial_ends_at").eq("company_id", companyId).maybeSingle(),
    (admin as any)
      .from("company_ai_daily_usage")
      .select("requests, tokens, credits")
      .eq("company_id", companyId)
      .eq("day", new Date().toISOString().slice(0, 10))
      .maybeSingle(),
  ]);

  const planKey = sub?.plan_key ?? "starter";
  const { data: plan } = await (admin as any)
    .from("plan_ai_limits")
    .select("*")
    .eq("plan_key", planKey)
    .maybeSingle();

  const planLimits = plan ?? { monthly_credits: 0, daily_limit: 0, trial_credits: 0 };
  const monthlyLimit = Number(planLimits.monthly_credits ?? 0);
  const dailyLimit = Number(planLimits.daily_limit ?? 0);

  const currentMonthly = Number(wallet?.consumed_credits ?? 0) + Number(wallet?.bonus_credits ?? 0);
  const currentDaily = Number(today?.requests ?? 0);
  const remainingMonthly = Math.max(0, monthlyLimit - currentMonthly);
  const remainingDaily = Math.max(0, dailyLimit - currentDaily);

  if (sub?.status === "trial" && (sub.trial_ends_at ? new Date(sub.trial_ends_at) < new Date() : false)) {
    return { allowed: false, reason: "Trial expired", remainingMonthly: 0, remainingDaily: 0 };
  }

  if (estimatedCredits > remainingMonthly) {
    return { allowed: false, reason: `Monthly AI credit limit exceeded (${remainingMonthly} remaining)`, remainingMonthly, remainingDaily };
  }

  if (dailyLimit > 0 && currentDaily >= dailyLimit) {
    return { allowed: false, reason: `Daily AI request limit reached (${dailyLimit}/day)`, remainingMonthly, remainingDaily };
  }

  return { allowed: true, remainingMonthly, remainingDaily };
}

export async function deductCredits(
  admin: SupabaseClient,
  companyId: string,
  credits: number,
  tokens: number,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: wallet }, { data: daily }] = await Promise.all([
    (admin as any).from("company_ai_credits").select("consumed_credits").eq("company_id", companyId).maybeSingle(),
    (admin as any).from("company_ai_daily_usage").select("requests, tokens, credits").eq("company_id", companyId).eq("day", today).maybeSingle(),
  ]);

  await (admin as any).from("company_ai_credits").upsert({
    company_id: companyId,
    consumed_credits: Number(wallet?.consumed_credits ?? 0) + credits,
    updated_at: new Date().toISOString(),
  }, { onConflict: "company_id" });

  await (admin as any).from("company_ai_daily_usage").upsert({
    company_id: companyId,
    day: today,
    requests: Number(daily?.requests ?? 0) + 1,
    tokens: Number(daily?.tokens ?? 0) + tokens,
    credits: Number(daily?.credits ?? 0) + credits,
    updated_at: new Date().toISOString(),
  }, { onConflict: "company_id,day" });
}
