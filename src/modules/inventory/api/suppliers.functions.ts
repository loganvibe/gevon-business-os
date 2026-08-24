import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSuppliers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("suppliers")
      .select("id, name, phone, email, status, created_at")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      name: z.string().trim().min(1).max(200),
      phone: z.string().max(50).optional(),
      email: z.string().email().max(255).optional(),
      notes: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("suppliers")
      .insert({
        company_id: data.companyId,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        notes: data.notes ?? null,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
