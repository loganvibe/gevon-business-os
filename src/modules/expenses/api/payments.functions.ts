import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const recordExpensePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        expenseId: z.string().uuid(),
        method: z.enum(["cash", "transfer", "card", "split", "other"]).default("cash"),
        amount: z.number().positive(),
        currencyCode: z.string().length(3).default("NGN"),
        reference: z.string().max(200).optional(),
        paidAt: z.string().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: expense, error: expErr } = await supabase
      .from("expenses")
      .select("id, total, amount_paid, status")
      .eq("id", data.expenseId)
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (expErr) throw new Error(expErr.message);
    if (!expense) throw new Error("Expense not found");
    if (expense.status === "rejected") throw new Error("Rejected expenses cannot be paid");

    const outstanding = Number(expense.total ?? 0) - Number(expense.amount_paid ?? 0);
    if (outstanding <= 0) throw new Error("This expense is already fully paid");
    if (data.amount > outstanding + 0.0001) {
      throw new Error(`Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}`);
    }

    const { data: row, error } = await supabase
      .from("expense_payments")
      .insert({
        company_id: data.companyId,
        expense_id: data.expenseId,
        method: data.method,
        amount: data.amount,
        currency_code: data.currencyCode,
        reference: data.reference ?? null,
        paid_at: data.paidAt ?? new Date().toISOString(),
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id, amount")
      .single();
    if (error) throw new Error(error.message);

    if (data.amount >= outstanding - 0.0001) {
      await supabase.from("event_queue").insert({
        company_id: data.companyId,
        event_key: "expense.paid",
        version: 1,
        payload: {
          companyId: data.companyId,
          expenseId: data.expenseId,
          amount: Number(expense.total ?? 0),
        },
        status: "queued",
        published_by: context.userId,
      });
    }

    return row;
  });

export const listExpensePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        expenseId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("expense_payments")
      .select("id, expense_id, method, amount, currency_code, reference, paid_at, notes")
      .eq("company_id", data.companyId)
      .order("paid_at", { ascending: false })
      .limit(data.limit);
    if (data.expenseId) q = q.eq("expense_id", data.expenseId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
