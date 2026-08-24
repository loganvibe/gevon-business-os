import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listPRInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["draft", "submitted", "approved", "rejected", "converted"]).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listPurchaseRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listPRInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("purchase_requests")
      .select("id, request_number, status, total_estimated, justification, branches(name), created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getPurchaseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pr, error } = await context.supabase
      .from("purchase_requests")
      .select("*, purchase_request_items(*), branches(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pr) throw new Error("Purchase request not found");
    return pr;
  });

const createPRInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  justification: z.string().max(2000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1).max(500),
    quantity: z.number().positive(),
    estimatedUnitCost: z.number().nonnegative().default(0),
    notes: z.string().max(500).optional(),
  })).min(1),
  submit: z.boolean().default(false),
});

export const createPurchaseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createPRInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: numberRow } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "PR",
    } as any);

    const status = data.submit ? "submitted" : "draft";
    const totalEstimated = data.items.reduce((sum, it) => sum + it.quantity * it.estimatedUnitCost, 0);

    const { data: pr, error } = await supabase
      .from("purchase_requests")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        request_number: numberRow as any,
        status,
        justification: data.justification ?? null,
        total_estimated: totalEstimated,
        requested_by: context.userId,
      })
      .select("id, request_number")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("purchase_request_items").insert(
      data.items.map((it) => ({
        company_id: data.companyId,
        purchase_request_id: pr.id,
        product_id: it.productId ?? null,
        description: it.description,
        quantity: it.quantity,
        estimated_unit_cost: it.estimatedUnitCost,
        notes: it.notes ?? null,
      }))
    );

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "purchase.request.created",
      version: 1,
      payload: { companyId: data.companyId, requestId: pr.id, requestNumber: pr.request_number, totalEstimated, createdBy: context.userId },
      status: "queued",
      published_by: context.userId,
    });

    return pr;
  });

export const approvePurchaseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("purchase_requests")
      .update({ status: "approved", approved_by: context.userId, decided_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .eq("status", "submitted")
      .select("id, request_number, requested_by")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Purchase request cannot be approved in its current state");

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "purchase.request.approved",
      version: 1,
      payload: { companyId: data.companyId, requestId: row.id, requestNumber: row.request_number, approvedBy: context.userId, createdBy: row.requested_by },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });

const listPOInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["draft", "sent", "confirmed", "partially_received", "received", "cancelled"]).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listPurchaseOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listPOInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("purchase_orders")
      .select("id, po_number, status, total, currency_code, vendors(name), branches(name), created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("purchase_orders")
      .select("*, purchase_order_items(*), vendors(name), branches(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Purchase order not found");
    return row;
  });

const createPOInput = z.object({
  companyId: z.string().uuid(),
  purchaseRequestId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  branchId: z.string().uuid().nullable().optional(),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1).max(500),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative().default(0),
    notes: z.string().max(500).optional(),
  })).min(1),
  notes: z.string().max(2000).optional(),
  expectedDeliveryAt: z.string().optional(),
});

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createPOInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: numberRow } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "PO",
    } as any);

    const subtotal = data.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        purchase_request_id: data.purchaseRequestId ?? null,
        vendor_id: data.vendorId ?? null,
        po_number: numberRow as any,
        status: "draft",
        currency_code: "NGN",
        subtotal,
        tax_total: 0,
        total: subtotal,
        notes: data.notes ?? null,
        expected_delivery_at: data.expectedDeliveryAt ?? null,
        created_by: context.userId,
      })
      .select("id, po_number")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("purchase_order_items").insert(
      data.items.map((it) => ({
        company_id: data.companyId,
        purchase_order_id: po.id,
        product_id: it.productId ?? null,
        description: it.description,
        quantity: it.quantity,
        unit_cost: it.unitCost,
        notes: it.notes ?? null,
      }))
    );

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "purchase.order.created",
      version: 1,
      payload: { companyId: data.companyId, orderId: po.id, poNumber: po.po_number, vendorId: data.vendorId, total: subtotal },
      status: "queued",
      published_by: context.userId,
    });

    return po;
  });
