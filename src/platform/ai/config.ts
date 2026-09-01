/**
 * Gevon AI Platform — Configuration
 * ----------------------------------
 * Resolves the effective provider/model/enabled state for an AI
 * capability by merging:
 *   1. Global default (ai_capability_configs)
 *   2. Per-company override (ai_capability_overrides)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AICapabilityConfig {
  capabilityKey: string;
  provider: string;
  model: string;
  enabled: boolean;
  maxTokens: number;
  temperature: number;
  creditCostPer1kTokens: number;
}

const DEFAULT_CONFIG: AICapabilityConfig = {
  capabilityKey: "",
  provider: "openrouter",
  model: "google/gemini-2.0-flash-exp:free",
  enabled: true,
  maxTokens: 2048,
  temperature: 0.7,
  creditCostPer1kTokens: 0.01,
};

export async function getEffectiveConfig(
  admin: SupabaseClient,
  capabilityKey: string,
  companyId: string | null,
): Promise<AICapabilityConfig> {
  const [{ data: globalRow }, ...rest] = await Promise.all([
    (admin as any)
      .from("ai_capability_configs")
      .select("*")
      .eq("capability_key", capabilityKey)
      .maybeSingle(),
    companyId
      ? (admin as any)
          .from("ai_capability_overrides")
          .select("*")
          .eq("capability_key", capabilityKey)
          .eq("company_id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const global = (globalRow ?? {}) as any;
  const override = (rest[0]?.data ?? null) as any;

  const cfg: AICapabilityConfig = {
    ...DEFAULT_CONFIG,
    capabilityKey,
    provider: global.provider ?? DEFAULT_CONFIG.provider,
    model: global.model ?? DEFAULT_CONFIG.model,
    enabled: global.enabled ?? true,
    maxTokens: global.max_tokens ?? DEFAULT_CONFIG.maxTokens,
    temperature: global.temperature ?? DEFAULT_CONFIG.temperature,
    creditCostPer1kTokens: global.credit_cost_per_1k_tokens ?? DEFAULT_CONFIG.creditCostPer1kTokens,
  };

  if (override) {
    if (override.provider !== null && override.provider !== undefined) cfg.provider = override.provider;
    if (override.model !== null && override.model !== undefined) cfg.model = override.model;
    if (override.enabled !== null && override.enabled !== undefined) cfg.enabled = override.enabled;
    if (override.max_tokens !== null && override.max_tokens !== undefined) cfg.maxTokens = override.max_tokens;
    if (override.temperature !== null && override.temperature !== undefined) cfg.temperature = override.temperature;
  }

  return cfg;
}
