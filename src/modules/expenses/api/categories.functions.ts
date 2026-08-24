import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listExpenseCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("expense_categories")
      .select("id, name, description, color, icon, is_system, is_active, created_at")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        description: z.string().max(500).optional(),
        color: z.string().max(20).optional(),
        icon: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("expense_categories")
      .insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        name: z.string().trim().min(1).max(80).optional(),
        description: z.string().max(500).nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expense_categories")
      .update({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
      })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expense_categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .eq("is_system", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
