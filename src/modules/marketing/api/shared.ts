/**
 * Shared helpers for the Customer Growth (marketing) module.
 * ----------------------------------------------------------
 * - `emitMarketingEvent` is the ONLY way this module talks to the rest of
 *   the platform. It validates against the event registry and enqueues on
 *   the platform event bus, so notifications, emails, workflows and
 *   automation rules all fan out through existing infrastructure.
 * - `applySegmentFilters` applies a declarative segment rule set onto an
 *   RLS-scoped PostgREST query.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getEvent } from "@/platform/events/registry";
import { buildFilters, toOrExpression, type SegmentRules } from "../engine/segments";

export type Sb = SupabaseClient<Database>;

export async function emitMarketingEvent(
  supabase: Sb,
  userId: string,
  key: string,
  companyId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const def = getEvent(key);
  if (!def) {
    console.error(`[marketing] unknown event ${key}`);
    return;
  }
  const parsed = def.payloadSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(`[marketing] invalid payload for ${key}: ${parsed.error.message}`);
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
  if (error) console.error(`[marketing] failed to publish ${key}: ${error.message}`);
}

/** Applies segment conditions to a `customers` query. */
export function applySegmentFilters<T>(query: T, rules: SegmentRules): T {
  const { logic, filters } = buildFilters(rules);
  if (!filters.length) return query;
  let q = query as any;
  if (logic === "any") {
    q = q.or(toOrExpression(filters));
    return q as T;
  }
  for (const f of filters) {
    if (f.operator === "is") q = q.is(f.column, f.value);
    else if (f.operator === "not.is") q = q.not(f.column, "is", f.value);
    else if (f.operator === "in") q = q.in(f.column, f.value as unknown[]);
    else if (f.operator === "cs") q = q.contains(f.column, f.value as unknown[]);
    else if (f.operator === "ov") q = q.overlaps(f.column, f.value as unknown[]);
    else if (f.operator === "ilike") q = q.ilike(f.column, f.value as string);
    else q = q.filter(f.column, f.operator, f.value as never);
  }
  return q as T;
}

/** Generates a human-friendly, hard-to-guess code (coupons / gift cards). */
export function generateCode(prefix: string, length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}${body}`;
}

/** Resolves the tier a points balance falls into for a program config. */
export function resolveTier(
  tiers: Array<{ name: string; min_points: number }> | unknown,
  lifetimePoints: number,
): string | null {
  if (!Array.isArray(tiers)) return null;
  const sorted = [...tiers]
    .filter((t) => t && typeof (t as any).name === "string")
    .map((t) => ({ name: String((t as any).name), min: Number((t as any).min_points ?? 0) }))
    .sort((a, b) => a.min - b.min);
  let current: string | null = null;
  for (const t of sorted) if (lifetimePoints >= t.min) current = t.name;
  return current;
}
