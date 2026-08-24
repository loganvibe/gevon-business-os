import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemInput = z.object({
  saleItemId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  condition: z.string().max(200).optional(),
});

const createInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  saleId: z.string().uuid(),
  returnType: z.enum(["full", "partial", "damaged"]).default("partial"),
  reason: z.string().max(1000).optional(),
  restock: z.boolean().default(true),
  items: z.array(itemInput).min(1),
});

export const createReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    let subtotal = 0;
    const prepped = data.items.map((it) => {
      const line = it.quantity * it.unitPrice;
      subtotal += line;
      return { ...it, line };
    });

    const { data: num, error: numErr } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "RET",
    });
    if (numErr) throw new Error(numErr.message);
    const returnNumber = String(num ?? "");

    const { data: ret, error } = await supabase
      .from("returns")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId,
        return_number: returnNumber,
        sale_id: data.saleId,
        return_type: data.returnType,
        status: "draft",
        reason: data.reason ?? null,
        subtotal,
        total: subtotal,
        restock: data.restock,
        created_by: context.userId,
      })
      .select("id, return_number")
      .single();
    if (error) throw new Error(error.message);

    const items = prepped.map((it) => ({
      return_id: ret!.id,
      sale_item_id: it.saleItemId ?? null,
      product_id: it.productId,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total: it.line,
      condition: it.condition ?? null,
    }));
    const { error: iErr } = await supabase.from("return_items").insert(items);
    if (iErr) throw new Error(iErr.message);

    return { id: ret!.id, returnNumber: ret!.return_number };
  });

export const approveReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("record_return_atomic", {
      _return_id: data.id,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReturns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      status: z.enum(["draft", "approved", "completed", "rejected"]).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("returns")
      .select("id, return_number, status, return_type, total, currency_code, sale_id, created_at")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });
