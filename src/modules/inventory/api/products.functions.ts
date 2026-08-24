import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  companyId: z.string().uuid(),
  search: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "archived", "draft"]).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("products")
      .select("id, name, sku, barcode, unit, cost_price, selling_price, currency_code, status, image_url, category_id, created_at")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  unit: z.enum(["piece","kg","g","l","ml","box","pack","carton","dozen","other"]).default("piece"),
  costPrice: z.number().nonnegative().default(0),
  sellingPrice: z.number().nonnegative().default(0),
  currencyCode: z.string().length(3).default("NGN"),
  imageUrl: z.string().url().optional(),
});

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("products")
      .insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
        sku: data.sku ?? null,
        barcode: data.barcode ?? null,
        category_id: data.categoryId ?? null,
        unit: data.unit,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        currency_code: data.currencyCode,
        image_url: data.imageUrl ?? null,
        created_by: context.userId,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);

    return row;
  });

const updateInput = z.object({
  id: z.string().uuid(),
  patch: createInput.omit({ companyId: true }).partial(),
});

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const p = data.patch;
    const { error } = await context.supabase
      .from("products")
      .update({
        ...(p.name !== undefined && { name: p.name }),
        ...(p.description !== undefined && { description: p.description }),
        ...(p.sku !== undefined && { sku: p.sku }),
        ...(p.barcode !== undefined && { barcode: p.barcode }),
        ...(p.categoryId !== undefined && { category_id: p.categoryId }),
        ...(p.unit !== undefined && { unit: p.unit }),
        ...(p.costPrice !== undefined && { cost_price: p.costPrice }),
        ...(p.sellingPrice !== undefined && { selling_price: p.sellingPrice }),
        ...(p.currencyCode !== undefined && { currency_code: p.currencyCode }),
        ...(p.imageUrl !== undefined && { image_url: p.imageUrl }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("products")
      .update({ status: "archived", deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
