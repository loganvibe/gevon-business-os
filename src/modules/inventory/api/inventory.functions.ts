import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      branchId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("inventory_items")
      .select("id, product_id, branch_id, quantity, minimum_stock_level, maximum_stock_level, last_movement_at, products(name, sku, unit, selling_price, cost_price)")
      .eq("company_id", data.companyId)
      .order("last_movement_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getLowStockItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("inventory_items")
      .select("id, product_id, branch_id, quantity, minimum_stock_level, products(name, sku)")
      .eq("company_id", data.companyId)
      .filter("quantity", "lte", "minimum_stock_level" as any);
    // The filter above needs raw sql; fallback:
    if (error) {
      const { data: all, error: e2 } = await context.supabase
        .from("inventory_items")
        .select("id, product_id, branch_id, quantity, minimum_stock_level, products(name, sku)")
        .eq("company_id", data.companyId);
      if (e2) throw new Error(e2.message);
      return { items: (all ?? []).filter((r: any) => Number(r.quantity) <= Number(r.minimum_stock_level ?? 0)) };
    }
    return { items: rows ?? [] };
  });

const movementInput = z.object({
  companyId: z.string().uuid(),
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

export const receiveStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => movementInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stock_movements").insert({
      company_id: data.companyId,
      product_id: data.productId,
      branch_id: data.branchId,
      movement_type: "purchase",
      quantity: data.quantity,
      unit_cost: data.unitCost ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
      branchId: z.string().uuid(),
      delta: z.number(),
      reason: z.enum(["adjustment", "damaged", "expired"]).default("adjustment"),
      notes: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stock_movements").insert({
      company_id: data.companyId,
      product_id: data.productId,
      branch_id: data.branchId,
      movement_type: data.reason,
      quantity: data.delta,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStockMovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("stock_movements")
      .select("id, product_id, branch_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, notes, created_at, products(name)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.productId) q = q.eq("product_id", data.productId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const inventorySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ count: productCount }, { data: items }] = await Promise.all([
      context.supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).is("deleted_at", null),
      context.supabase.from("inventory_items").select("quantity, minimum_stock_level, products(cost_price)").eq("company_id", data.companyId),
    ]);
    let stockValue = 0;
    let lowStock = 0;
    for (const it of (items ?? []) as any[]) {
      const qty = Number(it.quantity ?? 0);
      const cost = Number(it.products?.cost_price ?? 0);
      stockValue += qty * cost;
      if (qty <= Number(it.minimum_stock_level ?? 0)) lowStock += 1;
    }
    return {
      totalProducts: productCount ?? 0,
      stockValue,
      lowStockCount: lowStock,
    };
  });
