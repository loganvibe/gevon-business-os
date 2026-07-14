import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});

const createDraftInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  channel: z.enum(["walk_in", "online", "whatsapp", "phone", "external_pos"]).default("walk_in"),
  discountId: z.string().uuid().nullable().optional(),
  discountTotal: z.number().nonnegative().default(0),
  currencyCode: z.string().length(3).default("NGN"),
  notes: z.string().max(2000).optional(),
  items: z.array(itemInput).min(1),
});

export const createDraftSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createDraftInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    // Compute totals
    let subtotal = 0;
    let taxTotal = 0;
    const preppedItems = data.items.map((it) => {
      const line = it.quantity * it.unitPrice;
      const taxable = Math.max(line - it.discount, 0);
      const taxAmount = +(taxable * (it.taxRate / 100)).toFixed(4);
      subtotal += line;
      taxTotal += taxAmount;
      return { ...it, line, taxAmount };
    });
    const discountTotal = data.discountTotal;
    const total = Math.max(subtotal - discountTotal + taxTotal, 0);

    const { data: numberRow, error: numErr } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "SALE",
    } as any);
    if (numErr) throw new Error(numErr.message);

    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId,
        sale_number: numberRow as any,
        customer_id: data.customerId ?? null,
        channel: data.channel,
        status: "draft",
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        total,
        currency_code: data.currencyCode,
        discount_id: data.discountId ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id, sale_number")
      .single();
    if (saleErr) throw new Error(saleErr.message);

    const itemsPayload = preppedItems.map((it) => ({
      sale_id: sale!.id,
      product_id: it.productId,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      discount: it.discount,
      tax_rate: it.taxRate,
      tax_amount: it.taxAmount,
      total: Math.max(it.line - it.discount + it.taxAmount, 0),
      notes: it.notes ?? null,
    }));
    const { error: itemsErr } = await supabase.from("sale_items").insert(itemsPayload);
    if (itemsErr) throw new Error(itemsErr.message);

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "sale.created",
      version: 1,
      payload: { companyId: data.companyId, saleId: sale!.id, total },
      status: "queued",
      next_run_at: new Date().toISOString(),
    });

    return { id: sale!.id, saleNumber: sale!.sale_number, total };
  });

export const completeSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ saleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_sale_atomic", {
      _sale_id: data.saleId,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ saleId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_sale", {
      _sale_id: data.saleId,
      _reason: data.reason ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      status: z.enum(["draft", "completed", "cancelled"]).optional(),
      branchId: z.string().uuid().optional(),
      channel: z.enum(["walk_in", "online", "whatsapp", "phone", "external_pos"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sales")
      .select("id, sale_number, status, channel, subtotal, discount_total, tax_total, total, currency_code, payment_status, amount_paid, completed_at, created_at, branch_id, customer_id")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.channel) q = q.eq("channel", data.channel);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select("*, sale_items(*, products(name, sku)), payment_records(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return sale;
  });
