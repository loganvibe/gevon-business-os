/**
 * Thin event-bus helper for the intelligence module.
 * Validates against the registry then enqueues on the platform event bus,
 * so modules never fan out notifications or emails themselves.
 */
import { getEvent } from "@/platform/events/registry";
import type { Sb } from "./datasource";

export async function emitEvent(
  supabase: Sb,
  userId: string,
  key: string,
  companyId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const def = getEvent(key);
  if (!def) return;
  const parsed = def.payloadSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(`[intelligence] invalid payload for ${key}: ${parsed.error.message}`);
    return;
  }
  const { error } = await (supabase as any).from("event_queue").insert({
    event_key: def.key,
    version: def.version,
    company_id: companyId,
    payload: parsed.data,
    published_by: userId,
    status: "queued",
    next_run_at: new Date().toISOString(),
  });
  if (error) console.error(`[intelligence] failed to publish ${key}: ${error.message}`);
}
