/**
 * Checkout / cart server functions (Milestone 12).
 * ------------------------------------------------
 * A cart is a channel-agnostic basket. Completing a checkout does NOT
 * reimplement selling: it materialises a draft `sales` row plus items and
 * then calls the existing `complete_sale_atomic` RPC, which owns inventory
 * movement, low-stock detection and payment status.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { emitCommerceEvent, recomputeCartTotals, money } from "./shared";

const channelEnum = z.enum(["walk_in", "online", "whatsapp", "phone", "external_pos"]);

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        storeId: z.string().uuid().nullable().optional(),
        channel: channelEnum.default("walk_in"),
        customerId: z.string().uuid().nullable().optional(),
        currencyCode: z.string().length(3).default("NGN"),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: cart, error } = await supabase
      .from("carts")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        store_id: data.storeId ?? null,
        channel: data.channel,
        customer_id: data.customerId ?? null,
        currency_code: data.currencyCode,
        notes: data.notes ?? null,
        created_by: context.userId,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: data.companyId,
      action: "commerce.checkout.created",
      entityType: "carts",
      entityId: cart.id,
      after: cart,
    });
    await emitCommerceEvent(context.supabase, context.userId, "commerce.checkout.created", data.companyId, {
      companyId: data.companyId,
      cartId: cart.id,
      channel: data.channel,
    });
    return cart;
  });

export const getCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: cart, error } = await supabase.from("carts").select("*").eq("id", data.cartId).single();
    if (error) throw new Error(error.message);
    const { data: items } = await supabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", data.cartId)
      .order("created_at", { ascending: true });
    return { cart, items: items ?? [] };
  });

export const addCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cartId: z.string().uuid(),
        productId: z.string().uuid(),
        quantity: z.number().positive().max(100000),
        unitPrice: z.number().nonnegative().optional(),
        discount: z.number().nonnegative().default(0),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: cart, error: cErr } = await supabase
      .from("carts")
      .select("id, company_id, status")
      .eq("id", data.cartId)
      .single();
    if (cErr) throw new Error(cErr.message);
    if (cart.status !== "open") throw new Error("Cart is no longer open");

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, selling_price")
      .eq("id", data.productId)
      .eq("company_id", cart.company_id)
      .single();
    if (pErr) throw new Error("Product not found");

    const unitPrice = money(data.unitPrice ?? Number(product.selling_price ?? 0));
    const total = money(Math.max(unitPrice * data.quantity - data.discount, 0));

    const { data: item, error } = await supabase
      .from("cart_items")
      .insert({
        cart_id: data.cartId,
        product_id: data.productId,
        name_snapshot: product.name,
        quantity: data.quantity,
        unit_price: unitPrice,
        discount: data.discount,
        total,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const totals = await recomputeCartTotals(context.supabase, data.cartId);
    return { item, totals };
  });

export const updateCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        quantity: z.number().positive().max(100000).optional(),
        discount: z.number().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: existing, error: eErr } = await supabase
      .from("cart_items")
      .select("*")
      .eq("id", data.itemId)
      .single();
    if (eErr) throw new Error(eErr.message);

    const quantity = data.quantity ?? Number(existing.quantity);
    const discount = data.discount ?? Number(existing.discount ?? 0);
    const total = money(Math.max(Number(existing.unit_price) * quantity - discount, 0));

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity, discount, total })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);

    const totals = await recomputeCartTotals(context.supabase, existing.cart_id);
    return { ok: true, totals };
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: existing, error: eErr } = await supabase
      .from("cart_items")
      .select("cart_id")
      .eq("id", data.itemId)
      .single();
    if (eErr) throw new Error(eErr.message);
    const { error } = await supabase.from("cart_items").delete().eq("id", data.itemId);
    if (error) throw new Error(error.message);
    const totals = await recomputeCartTotals(context.supabase, existing.cart_id);
    return { ok: true, totals };
  });

/** Applies a cart-level discount (e.g. from an M11 promotion or coupon). */
export const applyCartDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cartId: z.string().uuid(),
        discountTotal: z.number().nonnegative(),
        couponCode: z.string().max(64).nullable().optional(),
        promotionId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("carts")
      .update({
        discount_total: data.discountTotal,
        coupon_code: data.couponCode ?? null,
        promotion_id: data.promotionId ?? null,
      })
      .eq("id", data.cartId);
    if (error) throw new Error(error.message);
    const totals = await recomputeCartTotals(context.supabase, data.cartId);
    return { ok: true, totals };
  });

export const setCartCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cartId: z.string().uuid(), customerId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("carts").update({ customer_id: data.customerId }).eq("id", data.cartId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Completes a checkout: materialises a sale via the existing Sales engine,
 * records the payment, issues a receipt, and publishes commerce events.
 * Inventory, low-stock detection and payment status are owned by
 * `complete_sale_atomic` — never duplicated here.
 */
export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cartId: z.string().uuid(),
        paymentMethod: z.enum(["cash", "transfer", "card", "split", "other"]).default("cash"),
        amountPaid: z.number().nonnegative().optional(),
        paymentReference: z.string().max(120).optional(),
        posSessionId: z.string().uuid().nullable().optional(),
        issueReceipt: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;

    const { data: cart, error: cErr } = await supabase.from("carts").select("*").eq("id", data.cartId).single();
    if (cErr) throw new Error(cErr.message);
    if (cart.status !== "open") throw new Error("Cart already processed");

    const { data: items, error: iErr } = await supabase.from("cart_items").select("*").eq("cart_id", data.cartId);
    if (iErr) throw new Error(iErr.message);
    if (!items || items.length === 0) throw new Error("Cannot complete an empty cart");

    const totals = await recomputeCartTotals(context.supabase, data.cartId);

    const { data: saleNumber, error: numErr } = await supabase.rpc("next_document_number", {
      _company_id: cart.company_id,
      _prefix: "SALE",
    });
    if (numErr) throw new Error(numErr.message);

    const { data: sale, error: sErr } = await supabase
      .from("sales")
      .insert({
        company_id: cart.company_id,
        branch_id: cart.branch_id,
        sale_number: saleNumber,
        customer_id: cart.customer_id,
        channel: cart.channel,
        status: "draft",
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total: totals.total,
        currency_code: cart.currency_code,
        notes: cart.notes,
        created_by: context.userId,
      })
      .select("id, sale_number, total")
      .single();
    if (sErr) throw new Error(sErr.message);

    const { error: siErr } = await supabase.from("sale_items").insert(
      items.map((it: any) => ({
        sale_id: sale.id,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: it.discount,
        tax_amount: it.tax_amount,
        total: it.total,
        notes: it.notes,
      })),
    );
    if (siErr) throw new Error(siErr.message);

    // Existing Sales engine owns inventory + payment status.
    const { error: rpcErr } = await supabase.rpc("complete_sale_atomic", { _sale_id: sale.id });
    if (rpcErr) throw new Error(rpcErr.message);

    const amount = data.amountPaid ?? Number(totals.total);
    if (amount > 0) {
      const { error: payErr } = await supabase.from("payment_records").insert({
        company_id: cart.company_id,
        sale_id: sale.id,
        method: data.paymentMethod,
        status: "paid",
        amount,
        currency_code: cart.currency_code,
        reference: data.paymentReference ?? null,
        paid_at: new Date().toISOString(),
        created_by: context.userId,
      });
      if (payErr) throw new Error(payErr.message);
    }

    await supabase
      .from("carts")
      .update({ status: "converted", sale_id: sale.id })
      .eq("id", data.cartId);

    if (data.posSessionId) {
      const { data: session } = await supabase
        .from("pos_sessions")
        .select("sales_count, sales_total")
        .eq("id", data.posSessionId)
        .single();
      if (session) {
        await supabase
          .from("pos_sessions")
          .update({
            sales_count: Number(session.sales_count ?? 0) + 1,
            sales_total: money(Number(session.sales_total ?? 0) + Number(totals.total)),
          })
          .eq("id", data.posSessionId);
      }
    }

    let receipt: { id: string; receipt_number: string } | null = null;
    if (data.issueReceipt) {
      const { data: receiptNumber } = await supabase.rpc("next_document_number", {
        _company_id: cart.company_id,
        _prefix: "RCPT",
      });
      const { data: company } = await supabase
        .from("companies")
        .select("name, email, phone, address")
        .eq("id", cart.company_id)
        .maybeSingle();

      const { data: r, error: rErr } = await supabase
        .from("receipts")
        .insert({
          company_id: cart.company_id,
          branch_id: cart.branch_id,
          sale_id: sale.id,
          receipt_number: receiptNumber,
          business_snapshot: company ?? {},
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          tax_total: totals.taxTotal,
          total: totals.total,
          currency_code: cart.currency_code,
          payment_method: data.paymentMethod,
          created_by: context.userId,
        })
        .select("id, receipt_number")
        .single();
      if (rErr) throw new Error(rErr.message);
      receipt = r;

      await supabase.from("receipt_items").insert(
        items.map((it: any) => ({
          receipt_id: r.id,
          product_id: it.product_id,
          name: it.name_snapshot ?? "Item",
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          total: it.total,
        })),
      );

      await emitCommerceEvent(context.supabase, context.userId, "commerce.receipt.created", cart.company_id, {
        companyId: cart.company_id,
        receiptId: r.id,
        receiptNumber: r.receipt_number,
        saleId: sale.id,
        total: Number(totals.total),
      });
    }

    await writeAudit(context, {
      companyId: cart.company_id,
      action: "commerce.checkout.completed",
      entityType: "sales",
      entityId: sale.id,
      after: { saleId: sale.id, cartId: cart.id, total: totals.total },
    });

    await emitCommerceEvent(context.supabase, context.userId, "commerce.sale.completed", cart.company_id, {
      companyId: cart.company_id,
      cartId: cart.id,
      saleId: sale.id,
      channel: cart.channel,
      total: Number(totals.total),
    });

    return { saleId: sale.id, saleNumber: sale.sale_number, total: totals.total, receipt };
  });

export const abandonCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("carts").update({ status: "abandoned" }).eq("id", data.cartId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
