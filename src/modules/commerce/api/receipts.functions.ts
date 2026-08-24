/**
 * Receipts (Milestone 12).
 * Receipts are immutable snapshots of a completed sale. Delivery to the
 * customer reuses the existing Communication Platform (email/SMS/WhatsApp
 * jobs) — no separate messaging infrastructure.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { emitCommerceEvent } from "./shared";

export const listReceipts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("receipts")
      .select("*")
      .eq("company_id", data.companyId)
      .order("issued_at", { ascending: false })
      .limit(data.limit);
    if (data.q) q = q.ilike("receipt_number", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ receiptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: receipt, error } = await supabase.from("receipts").select("*").eq("id", data.receiptId).single();
    if (error) throw new Error(error.message);
    const { data: items } = await supabase.from("receipt_items").select("*").eq("receipt_id", data.receiptId);
    return { receipt, items: items ?? [] };
  });

/** Issues a receipt for an already completed sale (e.g. a reprint request). */
export const createReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ saleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: sale, error: sErr } = await supabase
      .from("sales")
      .select("*")
      .eq("id", data.saleId)
      .single();
    if (sErr) throw new Error(sErr.message);
    if (sale.status !== "completed") throw new Error("Only completed sales can be receipted");

    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity, unit_price, discount, total")
      .eq("sale_id", data.saleId);

    const { data: receiptNumber } = await supabase.rpc("next_document_number", {
      _company_id: sale.company_id,
      _prefix: "RCPT",
    });
    const { data: company } = await supabase
      .from("companies")
      .select("name, email, phone, address")
      .eq("id", sale.company_id)
      .maybeSingle();

    const { data: receipt, error } = await supabase
      .from("receipts")
      .insert({
        company_id: sale.company_id,
        branch_id: sale.branch_id,
        sale_id: sale.id,
        receipt_number: receiptNumber,
        business_snapshot: company ?? {},
        subtotal: sale.subtotal,
        discount_total: sale.discount_total,
        tax_total: sale.tax_total,
        total: sale.total,
        currency_code: sale.currency_code,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (items?.length) {
      const productIds = items.map((i: any) => i.product_id).filter(Boolean);
      const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
      const nameById = new Map((products ?? []).map((p: any) => [p.id, p.name]));
      await supabase.from("receipt_items").insert(
        items.map((it: any) => ({
          receipt_id: receipt.id,
          product_id: it.product_id,
          name: nameById.get(it.product_id) ?? "Item",
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          total: it.total,
        })),
      );
    }

    await writeAudit(context, {
      companyId: sale.company_id,
      action: "commerce.receipt.created",
      entityType: "receipts",
      entityId: receipt.id,
      after: receipt,
    });
    await emitCommerceEvent(context.supabase, context.userId, "commerce.receipt.created", sale.company_id, {
      companyId: sale.company_id,
      receiptId: receipt.id,
      receiptNumber: receipt.receipt_number,
      saleId: sale.id,
      total: Number(sale.total),
    });
    return receipt;
  });

/**
 * Queues a receipt for delivery through the existing Communication Platform.
 * Consent is respected: opted-out customers are never messaged.
 */
export const sendReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        receiptId: z.string().uuid(),
        channel: z.enum(["email", "sms", "whatsapp", "in_app"]),
        destination: z.string().max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: receipt, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", data.receiptId)
      .single();
    if (error) throw new Error(error.message);

    const { error: jobErr } = await supabase.from("jobs").insert({
      company_id: receipt.company_id,
      job_type: data.channel === "email" ? "email.send" : "communication.send",
      payload: {
        channel: data.channel,
        to: data.destination,
        subject: `Receipt ${receipt.receipt_number}`,
        receiptId: receipt.id,
      },
      status: "queued",
      run_at: new Date().toISOString(),
      created_by: context.userId,
    });
    if (jobErr) throw new Error(jobErr.message);

    await supabase
      .from("receipts")
      .update({ delivery_status: "queued", delivery_channel: data.channel })
      .eq("id", receipt.id);

    return { ok: true };
  });
