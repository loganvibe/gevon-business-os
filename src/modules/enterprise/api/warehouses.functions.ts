import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listWarehouses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("warehouses")
      .select("id, name, code, address, status, branch_id, branches(name), created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.status) q = q.eq("status", data.status);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,code.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("warehouses")
      .select("*, branches(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Warehouse not found");
    return row;
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  code: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  branchId: z.string().uuid().nullable().optional(),
  managerUserId: z.string().uuid().nullable().optional(),
});

export const createWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("warehouses")
      .insert({
        company_id: data.companyId,
        name: data.name,
        code: data.code ?? null,
        address: data.address ?? null,
        branch_id: data.branchId ?? null,
        manager_user_id: data.managerUserId ?? null,
        created_by: context.userId,
      })
      .select("id, name, code")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateInput = createInput.partial().extend({ id: z.string().uuid(), companyId: z.string().uuid() });

export const updateWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.code !== undefined) patch["code"] = data.code;
    if (data.address !== undefined) patch["address"] = data.address;
    if (data.branchId !== undefined) patch["branch_id"] = data.branchId;
    if (data.managerUserId !== undefined) patch["manager_user_id"] = data.managerUserId;

    const { error } = await context.supabase
      .from("warehouses")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("warehouses")
      .update({ status: "archived" })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
