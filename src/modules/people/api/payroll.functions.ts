/** Payroll foundation server functions (cycles + per-employee items). */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPayrollCycles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("payroll_cycles")
      .select(
        "id, name, period_start, period_end, pay_date, status, total_gross, total_deductions, total_net, currency_code, created_at",
      )
      .eq("company_id", data.companyId)
      .order("period_start", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPayrollItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cycleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("payroll_items")
      .select(
        "id, employee_id, base_salary, allowance_total, deduction_total, gross_pay, net_pay, currency_code, notes",
      )
      .eq("cycle_id", data.cycleId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPayrollCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(120),
        periodStart: z.string(),
        periodEnd: z.string(),
        payDate: z.string().optional(),
        currencyCode: z.string().length(3).default("NGN"),
        /** Pre-fill items from every active employee's base salary. */
        prefill: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: cycle, error } = await supabase
      .from("payroll_cycles")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        name: data.name,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        pay_date: data.payDate ?? null,
        currency_code: data.currencyCode,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.prefill) {
      const { data: employees } = await supabase
        .from("employees")
        .select("id, base_salary, currency_code")
        .eq("company_id", data.companyId)
        .is("deleted_at", null)
        .in("status", ["active", "probation", "on_leave"]);
      if (employees?.length) {
        const { error: itemErr } = await supabase.from("payroll_items").insert(
          employees.map((e) => ({
            company_id: data.companyId,
            cycle_id: cycle!.id,
            employee_id: e.id,
            base_salary: e.base_salary ?? 0,
            currency_code: e.currency_code ?? data.currencyCode,
          })),
        );
        if (itemErr) throw new Error(itemErr.message);
      }
    }

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "payroll.cycle.created",
      version: 1,
      payload: {
        companyId: data.companyId,
        cycleId: cycle!.id,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
      status: "queued",
      published_by: context.userId,
    });

    return cycle;
  });

export const updatePayrollItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        baseSalary: z.number().nonnegative().optional(),
        allowanceTotal: z.number().nonnegative().optional(),
        deductionTotal: z.number().nonnegative().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.baseSalary !== undefined) patch["base_salary"] = data.baseSalary;
    if (data.allowanceTotal !== undefined) patch["allowance_total"] = data.allowanceTotal;
    if (data.deductionTotal !== undefined) patch["deduction_total"] = data.deductionTotal;
    if (data.notes !== undefined) patch["notes"] = data.notes;
    const { error } = await context.supabase.from("payroll_items").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPayrollCycleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        status: z.enum(["draft", "processing", "pending_approval", "approved", "paid", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "approved") {
      patch["approved_by"] = context.userId;
      patch["approved_at"] = new Date().toISOString();
    }
    const { data: row, error } = await context.supabase
      .from("payroll_cycles")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .select("id, total_net")
      .single();
    if (error) throw new Error(error.message);

    if (data.status === "approved") {
      await context.supabase.from("event_queue").insert({
        company_id: data.companyId,
        event_key: "payroll.cycle.approved",
        version: 1,
        payload: {
          companyId: data.companyId,
          cycleId: row!.id,
          totalNet: Number(row!.total_net ?? 0),
        },
        status: "queued",
        published_by: context.userId,
      });
    }

    return { ok: true };
  });
