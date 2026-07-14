import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});

const createInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  channel: z.enum(["walk_in", "online", "whatsapp", "phone", "external_pos"]),
  expectedAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
  currencyCode: z.string().length(3).default("NGN"),
  items: z.array(itemInput).min(1),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    let subtotal = 0;
    let discountTotal = 0;
    const prepped = data.items.map((it) => {
      const line = it.quantity * it.unitPrice;
      subtotal += line;
      discountTotal += it.discount;
      return { ...it, line };
    });
    const total = Math.max(subtotal - discountTotal, 0);

    const { data: num, error: numErr } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "ORD",
    } as any);
    if (numErr) throw new Error(numErr.message);

    const defaultStatus = data.channel === "walk_in" ? "draft" : "pending";
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId,
        order_number: num as any,
        customer_id: data.customerId ?? null,
        channel: data.channel,
        status: defaultStatus,
        subtotal,
        discount_total: discountTotal,
        tax_total: 0,
        total,
        currency_code: data.currencyCode,
        expected_at: data.expectedAt ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id, order_number")
      .single();
    if (error) throw new Error(error.message);

    const items = prepped.map((it) => ({
      order_id: order!.id,
      product_id: it.productId,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      discount: it.discount,
      tax_amount: 0,
      total: Math.max(it.line - it.discount, 0),
      notes: it.notes ?? null,
    }));
    const { error: iErr } = await supabase.from("order_items").insert(items);
    if (iErr) throw new Error(iErr.message);

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "order.created",
      version: 1,
      payload: { companyId: data.companyId, orderId: order!.id, channel: data.channel, total },
      status: "queued",
      next_run_at: new Date().toISOString(),
    });

    return { id: order!.id, orderNumber: order!.order_number };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft", "pending", "confirmed", "completed", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.status === "completed") {
      const { data: o } = await context.supabase
        .from("orders")
        .select("company_id, id, sale_id")
        .eq("id", data.id)
        .single();
      if (o) {
        await context.supabase.from("event_queue").insert({
          company_id: o.company_id,
          event_key: "order.completed",
          version: 1,
          payload: { companyId: o.company_id, orderId: o.id, saleId: o.sale_id },
          status: "queued",
          next_run_at: new Date().toISOString(),
        });
      }
    }
    return { ok: true };
  });

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      status: z.enum(["draft", "pending", "confirmed", "completed", "cancelled"]).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("orders")
      .select("id, order_number, status, channel, total, currency_code, expected_at, created_at, branch_id, customer_id")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*, products(name, sku))")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
