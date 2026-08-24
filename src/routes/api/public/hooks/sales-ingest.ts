/**
 * External POS ingestion endpoint (Milestone 6, Integrated Mode).
 * Accepts signed sale events from external POS systems and inserts them
 * as completed sales with channel='external_pos'. Inventory decrement
 * is skipped unless the payload sets syncInventory=true.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const payloadSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  externalReference: z.string().max(200),
  occurredAt: z.string().optional(),
  currencyCode: z.string().length(3).default("NGN"),
  syncInventory: z.boolean().default(false),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    discount: z.number().nonnegative().default(0),
    taxAmount: z.number().nonnegative().default(0),
  })).min(1),
  payments: z.array(z.object({
    method: z.enum(["cash", "transfer", "card", "split", "other"]).default("cash"),
    amount: z.number(),
    reference: z.string().max(200).optional(),
  })).default([]),
});

export const Route = createFileRoute("/api/public/hooks/sales-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SALES_INGEST_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });

        const sig = request.headers.get("x-gevon-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: z.infer<typeof payloadSchema>;
        try {
          payload = payloadSchema.parse(JSON.parse(body));
        } catch (e: any) {
          return new Response(`Invalid payload: ${e.message}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let subtotal = 0;
        let taxTotal = 0;
        let discountTotal = 0;
        for (const it of payload.items) {
          subtotal += it.quantity * it.unitPrice;
          taxTotal += it.taxAmount;
          discountTotal += it.discount;
        }
        const total = Math.max(subtotal - discountTotal + taxTotal, 0);

        const { data: num, error: numErr } = await (supabaseAdmin as any).rpc("next_document_number", {
          _company_id: payload.companyId,
          _prefix: "SALE",
        });
        if (numErr) return new Response(numErr.message, { status: 500 });

        const { data: sale, error: sErr } = await (supabaseAdmin as any)
          .from("sales")
          .insert({
            company_id: payload.companyId,
            branch_id: payload.branchId,
            sale_number: num,
            channel: "external_pos",
            status: "completed",
            subtotal,
            discount_total: discountTotal,
            tax_total: taxTotal,
            total,
            currency_code: payload.currencyCode,
            external_reference: payload.externalReference,
            completed_at: payload.occurredAt ?? new Date().toISOString(),
            created_by: null,
          })
          .select("id")
          .single();
        if (sErr) return new Response(sErr.message, { status: 500 });

        const items = payload.items.map((it) => ({
          sale_id: sale.id,
          product_id: it.productId,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          discount: it.discount,
          tax_amount: it.taxAmount,
          total: Math.max(it.quantity * it.unitPrice - it.discount + it.taxAmount, 0),
        }));
        await (supabaseAdmin as any).from("sale_items").insert(items);

        if (payload.syncInventory) {
          for (const it of payload.items) {
            await (supabaseAdmin as any).from("stock_movements").insert({
              company_id: payload.companyId,
              product_id: it.productId,
              branch_id: payload.branchId,
              movement_type: "sale",
              quantity: it.quantity,
              reference_type: "sale",
              reference_id: sale.id,
            });
          }
        }

        for (const p of payload.payments) {
          await (supabaseAdmin as any).from("payment_records").insert({
            company_id: payload.companyId,
            sale_id: sale.id,
            method: p.method,
            status: "paid",
            amount: p.amount,
            currency_code: payload.currencyCode,
            reference: p.reference ?? null,
            created_by: null,
          });
        }

        await (supabaseAdmin as any).from("event_queue").insert({
          company_id: payload.companyId,
          event_key: "sale.completed",
          version: 1,
          payload: { companyId: payload.companyId, saleId: sale.id, total, source: "external_pos" },
          status: "queued",
          next_run_at: new Date().toISOString(),
        });

        return Response.json({ ok: true, saleId: sale.id });
      },
    },
  },
});
