import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Business finance summary — the "money in vs money out" view.
 * Income comes from the Sales module (completed sales); outflow from Expenses.
 * Both are RLS-scoped, so a company with the sales module disabled simply
 * reports zero income rather than failing.
 */
export const financeSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().optional(),
        /** Number of days the window covers. Defaults to the current month. */
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = data.from
      ? new Date(data.from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = data.to ? new Date(data.to) : now;

    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    // ---- Expenses in window -------------------------------------------
    let expQ = supabase
      .from("expenses")
      .select("total, amount_paid, status, expense_date, category_id")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .neq("status", "rejected")
      .gte("expense_date", isoDate(startOfMonth))
      .lte("expense_date", isoDate(endDate));
    if (data.branchId) expQ = expQ.eq("branch_id", data.branchId);
    const { data: expenses, error: expErr } = await expQ;
    if (expErr) throw new Error(expErr.message);

    const rows = expenses ?? [];
    const totalExpenses = rows.reduce((s, r: any) => s + Number(r.total ?? 0), 0);
    const todayIso = isoDate(startOfToday);
    const todaysExpenses = rows
      .filter((r: any) => r.expense_date === todayIso)
      .reduce((s, r: any) => s + Number(r.total ?? 0), 0);
    const unpaidExpenses = rows.reduce(
      (s, r: any) => s + Math.max(Number(r.total ?? 0) - Number(r.amount_paid ?? 0), 0),
      0,
    );

    // ---- By category ----------------------------------------------------
    const { data: categories } = await supabase
      .from("expense_categories")
      .select("id, name, color")
      .eq("company_id", data.companyId)
      .is("deleted_at", null);
    const catName = new Map((categories ?? []).map((c: any) => [c.id, c.name]));
    const byCategoryMap = new Map<string, number>();
    for (const r of rows as any[]) {
      const key = r.category_id ? (catName.get(r.category_id) ?? "Uncategorized") : "Uncategorized";
      byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + Number(r.total ?? 0));
    }
    const byCategory = [...byCategoryMap.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // ---- Pending approvals ---------------------------------------------
    const { count: pendingApproval } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .eq("status", "pending");

    // ---- Income (completed sales) --------------------------------------
    let salesQ = supabase
      .from("sales")
      .select("total, completed_at")
      .eq("company_id", data.companyId)
      .eq("status", "completed")
      .gte("completed_at", startOfMonth.toISOString());
    if (data.branchId) salesQ = salesQ.eq("branch_id", data.branchId);
    const { data: sales } = await salesQ;
    const totalIncome = (sales ?? []).reduce((s, r: any) => s + Number(r.total ?? 0), 0);
    const todaysIncome = (sales ?? [])
      .filter((r: any) => r.completed_at && new Date(r.completed_at) >= startOfToday)
      .reduce((s, r: any) => s + Number(r.total ?? 0), 0);

    const estimatedProfit = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? (estimatedProfit / totalIncome) * 100 : 0;

    return {
      periodStart: isoDate(startOfMonth),
      periodEnd: isoDate(endDate),
      totalIncome,
      totalExpenses,
      estimatedProfit,
      margin,
      todaysIncome,
      todaysExpenses,
      unpaidExpenses,
      expenseCount: rows.length,
      pendingApproval: pendingApproval ?? 0,
      byCategory,
    };
  });
