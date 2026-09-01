/**
 * Gevon AI Platform — Centralized Model Pricing
 * -----------------------------------------------
 * Single source of truth for OpenRouter model pricing.
 * Admins update this table; the system reads from it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ModelPricing {
  provider: string;
  model: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  currency: string;
  isActive: boolean;
}

export async function getModelPricing(
  admin: SupabaseClient,
  provider: string,
  model: string,
): Promise<ModelPricing | null> {
  const { data } = await (admin as any)
    .from("ai_model_pricing")
    .select("*")
    .eq("provider", provider)
    .eq("model", model)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return {
    provider: data.provider,
    model: data.model,
    inputPricePer1k: Number(data.input_price_per_1k ?? 0),
    outputPricePer1k: Number(data.output_price_per_1k ?? 0),
    currency: data.currency ?? "USD",
    isActive: data.is_active,
  };
}

export async function listModelPricing(admin: SupabaseClient): Promise<ModelPricing[]> {
  const { data } = await (admin as any)
    .from("ai_model_pricing")
    .select("*")
    .order("provider", { ascending: true })
    .order("model", { ascending: true });
  return (data ?? []).map((r: any) => ({
    provider: r.provider,
    model: r.model,
    inputPricePer1k: Number(r.input_price_per_1k ?? 0),
    outputPricePer1k: Number(r.output_price_per_1k ?? 0),
    currency: r.currency ?? "USD",
    isActive: r.is_active,
  }));
}

export function computeProviderCost(
  pricing: ModelPricing | null,
  promptTokens: number,
  completionTokens: number,
): number {
  if (!pricing) return 0;
  const inputCost = (promptTokens / 1000) * pricing.inputPricePer1k;
  const outputCost = (completionTokens / 1000) * pricing.outputPricePer1k;
  return Math.round((inputCost + outputCost) * 1000000) / 1000000;
}
