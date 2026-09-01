/**
 * Gevon AI Platform — Credits & Usage Tracking
 * ---------------------------------------------
 * Logs every AI call to `ai_usage_logs` with full cost data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AICompletionResult } from "./provider";
import type { ModelPricing } from "./pricing";

export interface AIUsageLogEntry {
  companyId: string | null;
  capabilityKey: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerCostUsd: number;
  creditsUsed: number;
  userId: string | null;
  status: "success" | "error";
  errorMessage?: string;
  requestDurationMs?: number;
}

export async function logAIUsage(
  admin: SupabaseClient,
  entry: AIUsageLogEntry,
): Promise<void> {
  await (admin as any).from("ai_usage_logs").insert({
    company_id: entry.companyId,
    capability_key: entry.capabilityKey,
    provider: entry.provider,
    model: entry.model,
    input_tokens: entry.inputTokens,
    output_tokens: entry.outputTokens,
    total_tokens: entry.totalTokens,
    credits_used: entry.creditsUsed,
    user_id: entry.userId,
    status: entry.status,
    error_message: entry.errorMessage ?? null,
    request_duration_ms: entry.requestDurationMs ?? null,
    provider_cost_usd: entry.providerCostUsd ?? null,
  });
}

export function computeCredits(
  pricing: ModelPricing | null,
  result: AICompletionResult,
  creditCostPer1kTokens: number,
): number {
  const total = result.usage.totalTokens || (result.usage.promptTokens + result.usage.completionTokens);
  const modelCost = pricing ? (total / 1000) * ((pricing.inputPricePer1k + pricing.outputPricePer1k) / 2) : 0;
  const markup = (total / 1000) * creditCostPer1kTokens;
  return Math.round((modelCost + markup) * 100) / 100;
}
