/**
 * ai.execute job handler.
 *
 * Executes an AI capability via OpenRouter, logs usage, and stores
 * the result back into the event_log so downstream consumers can
 * read the AI output.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createOpenRouterProvider } from "@/platform/ai/provider";
import { getEffectiveConfig } from "@/platform/ai/config";
import { logAIUsage } from "@/platform/ai/credits";

export async function handleAIExecute(
  admin: SupabaseClient,
  payload: Record<string, any>,
  jobId: string,
): Promise<Record<string, any> | void> {
  const { capabilityKey, companyId, eventQueueId, prompt, context: ctx } = payload as {
    capabilityKey: string;
    companyId?: string | null;
    eventQueueId?: string;
    prompt?: string;
    context?: Record<string, unknown>;
  };

  if (!capabilityKey) {
    throw new Error("ai.execute job missing capabilityKey");
  }

  const cfg = await getEffectiveConfig(admin, capabilityKey, companyId ?? null);
  if (!cfg.enabled) {
    const msg = `AI capability "${capabilityKey}" is disabled`;
    await logAIUsage(admin, {
      companyId: companyId ?? null,
      capabilityKey,
      provider: cfg.provider,
      model: cfg.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      creditsUsed: 0,
      userId: null,
      status: "error",
      errorMessage: msg,
    });
    return { error: msg };
  }

  const provider = createOpenRouterProvider();
  const messages = [
    { role: "system" as const, content: prompt ?? `Execute AI capability: ${capabilityKey}` },
  ];

  const result = await provider.chat(messages, {
    model: cfg.model,
    maxTokens: cfg.maxTokens,
    temperature: cfg.temperature,
  });

  const credits = (result.usage.totalTokens / 1000) * cfg.creditCostPer1kTokens;

  await logAIUsage(admin, {
    companyId: companyId ?? null,
    capabilityKey,
    provider: result.provider,
    model: result.model,
    inputTokens: result.usage.promptTokens,
    outputTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    creditsUsed: Math.round(credits * 100) / 100,
    userId: null,
    status: "success",
  });

  // Persist result to event_log so consumers can read it
  if (eventQueueId) {
    await (admin as any).from("event_log").insert({
      event_queue_id: eventQueueId,
      level: "info",
      message: `ai capability executed: ${capabilityKey}`,
      meta: {
        capabilityKey,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        credits,
        content: result.content,
      },
    });
  }

  return {
    capabilityKey,
    content: result.content,
    usage: result.usage,
    model: result.model,
    provider: result.provider,
    credits,
  };
}
