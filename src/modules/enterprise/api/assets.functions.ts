import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  companyId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["active", "maintenance", "damaged", "lost", "retired", "disposed"]).optional(),
  assignedTo: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("assets")
      .select("id, name, asset_tag, serial_number, model, manufacturer, status, purchase_cost, current_value, currency_code, branch_id, assigned_to, asset_categories(name), created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.status) q = q.eq("status", data.status);
    if (data.assignedTo) q = q.eq("assigned_to", data.assignedTo);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,asset_tag.ilike.%${data.q}%,serial_number.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: asset, error } = await context.supabase
      .from("assets")
      .select("*, asset_categories(*), asset_assignments(*), employees(first_name, last_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) throw new Error("Asset not found");
    return asset;
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  assetTag: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().nonnegative().optional(),
  currentValue: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3).default("NGN"),
  location: z.string().max(200).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  warrantyExpiresAt: z.string().optional(),
});

export const createAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("assets")
      .insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
        asset_tag: data.assetTag ?? null,
        serial_number: data.serialNumber ?? null,
        model: data.model ?? null,
        manufacturer: data.manufacturer ?? null,
        category_id: data.categoryId ?? null,
        branch_id: data.branchId ?? null,
        purchase_date: data.purchaseDate ?? null,
        purchase_cost: data.purchaseCost ?? null,
        current_value: data.currentValue ?? null,
        currency_code: data.currencyCode,
        location: data.location ?? null,
        assigned_to: data.assignedTo ?? null,
        warranty_expires_at: data.warrantyExpiresAt ?? null,
        created_by: context.userId,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateInput = createInput.partial().extend({ id: z.string().uuid(), companyId: z.string().uuid() });

export const updateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.description !== undefined) patch["description"] = data.description;
    if (data.assetTag !== undefined) patch["asset_tag"] = data.assetTag;
    if (data.serialNumber !== undefined) patch["serial_number"] = data.serialNumber;
    if (data.model !== undefined) patch["model"] = data.model;
    if (data.manufacturer !== undefined) patch["manufacturer"] = data.manufacturer;
    if (data.categoryId !== undefined) patch["category_id"] = data.categoryId;
    if (data.branchId !== undefined) patch["branch_id"] = data.branchId;
    if (data.purchaseDate !== undefined) patch["purchase_date"] = data.purchaseDate;
    if (data.purchaseCost !== undefined) patch["purchase_cost"] = data.purchaseCost;
    if (data.currentValue !== undefined) patch["current_value"] = data.currentValue;
    if (data.location !== undefined) patch["location"] = data.location;
    if (data.assignedTo !== undefined) patch["assigned_to"] = data.assignedTo;
    if (data.warrantyExpiresAt !== undefined) patch["warranty_expires_at"] = data.warrantyExpiresAt;

    const { error } = await context.supabase
      .from("assets")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid(), employeeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await supabase.from("asset_assignments").insert({
      company_id: data.companyId,
      asset_id: data.id,
      employee_id: data.employeeId,
    });
    await supabase.from("assets").update({ assigned_to: data.employeeId }).eq("id", data.id);
    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "asset.assigned",
      version: 1,
      payload: { companyId: data.companyId, assetId: data.id, employeeId: data.employeeId },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });
