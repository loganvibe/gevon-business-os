/**
 * Online store foundation (Milestone 12).
 * ---------------------------------------
 * The storefront is a *publication surface* over the existing Inventory
 * catalogue. Only explicitly published products of a published store are
 * readable by the public; nothing else (costs, suppliers, staff, finance)
 * is ever exposed.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const listStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("stores")
      .select("*")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(2).max(100),
        slug: z.string().trim().min(2).max(60).regex(slugRe, "Use lowercase letters, numbers and dashes"),
        tagline: z.string().max(160).optional(),
        description: z.string().max(2000).optional(),
        currencyCode: z.string().length(3).default("NGN"),
        contactPhone: z.string().max(40).optional(),
        contactEmail: z.string().email().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("stores")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        name: data.name,
        slug: data.slug,
        tagline: data.tagline ?? null,
        description: data.description ?? null,
        currency_code: data.currencyCode,
        contact_phone: data.contactPhone ?? null,
        contact_email: data.contactEmail ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "commerce.store.created",
      entityType: "stores",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const updateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        name: z.string().trim().min(2).max(100).optional(),
        tagline: z.string().max(160).nullable().optional(),
        description: z.string().max(2000).nullable().optional(),
        isPublished: z.boolean().optional(),
        acceptsDelivery: z.boolean().optional(),
        acceptsPickup: z.boolean().optional(),
        deliveryFee: z.number().nonnegative().optional(),
        minOrderAmount: z.number().nonnegative().optional(),
        contactPhone: z.string().max(40).nullable().optional(),
        contactEmail: z.string().email().max(200).nullable().optional(),
        address: z.string().max(300).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.tagline !== undefined) patch.tagline = data.tagline;
    if (data.description !== undefined) patch.description = data.description;
    if (data.isPublished !== undefined) patch.is_published = data.isPublished;
    if (data.acceptsDelivery !== undefined) patch.accepts_delivery = data.acceptsDelivery;
    if (data.acceptsPickup !== undefined) patch.accepts_pickup = data.acceptsPickup;
    if (data.deliveryFee !== undefined) patch.delivery_fee = data.deliveryFee;
    if (data.minOrderAmount !== undefined) patch.min_order_amount = data.minOrderAmount;
    if (data.contactPhone !== undefined) patch.contact_phone = data.contactPhone;
    if (data.contactEmail !== undefined) patch.contact_email = data.contactEmail;
    if (data.address !== undefined) patch.address = data.address;

    const { data: row, error } = await (context.supabase as any)
      .from("stores")
      .update(patch)
      .eq("id", data.storeId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: row.company_id,
      action: "commerce.store.updated",
      entityType: "stores",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const listStoreProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("store_products")
      .select("*, products(name, sku, selling_price)")
      .eq("store_id", data.storeId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/** Publishes (or unpublishes) a product on a store. */
export const publishProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        storeId: z.string().uuid(),
        productId: z.string().uuid(),
        isPublished: z.boolean().default(true),
        priceOverride: z.number().nonnegative().nullable().optional(),
        publicDescription: z.string().max(1000).nullable().optional(),
        isFeatured: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("store_products")
      .upsert(
        {
          company_id: data.companyId,
          store_id: data.storeId,
          product_id: data.productId,
          is_published: data.isPublished,
          price_override: data.priceOverride ?? null,
          public_description: data.publicDescription ?? null,
          is_featured: data.isFeatured ?? false,
          sort_order: data.sortOrder ?? 0,
        },
        { onConflict: "store_id,product_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: data.isPublished ? "commerce.product.published" : "commerce.product.unpublished",
      entityType: "store_products",
      entityId: row.id,
      after: row,
    });
    return row;
  });

/**
 * PUBLIC storefront read. Unauthenticated and intentionally narrow:
 * it uses the publishable (anon) key and projects only safe columns.
 */
export const getPublicStorefront = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ slug: z.string().min(1).max(60).regex(slugRe) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const url = process.env["SUPABASE_URL"]!;
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: store } = await (client as any)
      .from("stores")
      .select(
        "id, slug, name, tagline, description, logo_url, banner_url, currency_code, contact_phone, contact_email, address, accepts_delivery, accepts_pickup, delivery_fee, min_order_amount",
      )
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!store) return { store: null, products: [] };

    const { data: products } = await (client as any)
      .from("store_products")
      .select("id, price_override, availability, is_featured, public_description, image_url, sort_order, products(name, sku, selling_price)")
      .eq("store_id", store.id)
      .eq("is_published", true)
      .order("sort_order");

    return {
      store,
      products: (products ?? []).map((p: any) => ({
        id: p.id,
        name: p.products?.name ?? "Product",
        description: p.public_description,
        price: Number(p.price_override ?? p.products?.selling_price ?? 0),
        availability: p.availability,
        isFeatured: p.is_featured,
        imageUrl: p.image_url,
      })),
    };
  });
