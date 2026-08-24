import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid().optional(),
      orderId: z.string().uuid().optional(),
      method: z.enum(["cash", "transfer", "card", "split", "other"]).default("cash"),
      amount: z.number(),
      currencyCode: z.string().length(3).default("NGN"),
      reference: z.string().max(200).optional(),
      provider: z.string().max(100).optional(),
      notes: z.string().max(1000).optional(),
    }).refine((v) => !!v.saleId || !!v.orderId, { message: "saleId or orderId required" }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("payment_records")
      .insert({
        company_id: data.companyId,
        sale_id: data.saleId ?? null,
        order_id: data.orderId ?? null,
        method: data.method,
        status: "paid",
        amount: data.amount,
        currency_code: data.currencyCode,
        reference: data.reference ?? null,
        provider: data.provider ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id, amount")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("payment_records")
      .select("id, sale_id, order_id, method, status, amount, currency_code, reference, paid_at, notes, created_at")
      .eq("company_id", data.companyId)
      .order("paid_at", { ascending: false })
      .limit(data.limit);
    if (data.saleId) q = q.eq("sale_id", data.saleId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });
