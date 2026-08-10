/**
 * Shared helpers for the Commerce Engine.
 * ---------------------------------------
 * Commerce talks to the rest of the platform ONLY through the existing
 * event bus (`event_queue`) and existing module server functions.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getEvent } from "@/platform/events/registry";

export type Sb = SupabaseClient<Database>;

export async function emitCommerceEvent(
  supabase: Sb,
  userId: string,
  key: string,
  companyId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const def = getEvent(key);
  if (!def) {
    console.error(`[commerce] unknown event ${key}`);
    return;
  }
  const parsed = def.payloadSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(`[commerce] invalid payload for ${key}: ${parsed.error.message}`);
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
  if (error) console.error(`[commerce] failed to publish ${key}: ${error.message}`);
}

/** Recomputes and persists cart totals from its line items. */
export async function recomputeCartTotals(supabase: Sb, cartId: string) {
  const { data: items, error } = await (supabase as any)
    .from("cart_items")
    .select("quantity, unit_price, discount, tax_amount")
    .eq("cart_id", cartId);
  if (error) throw new Error(error.message);

  let subtotal = 0;
  let discountLines = 0;
  let taxTotal = 0;
  for (const it of items ?? []) {
    subtotal += Number(it.quantity) * Number(it.unit_price);
    discountLines += Number(it.discount ?? 0);
    taxTotal += Number(it.tax_amount ?? 0);
  }

  const { data: cart, error: cErr } = await (supabase as any)
    .from("carts")
    .select("discount_total")
    .eq("id", cartId)
    .single();
  if (cErr) throw new Error(cErr.message);

  const cartLevelDiscount = Math.max(Number(cart?.discount_total ?? 0) - discountLines, 0);
  const discountTotal = discountLines + cartLevelDiscount;
  const total = Math.max(subtotal - discountTotal + taxTotal, 0);

  const { error: uErr } = await (supabase as any)
    .from("carts")
    .update({ subtotal, discount_total: discountTotal, tax_total: taxTotal, total })
    .eq("id", cartId);
  if (uErr) throw new Error(uErr.message);

  return { subtotal, discountTotal, taxTotal, total };
}

/** Rounds monetary values to 2 decimals consistently. */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
