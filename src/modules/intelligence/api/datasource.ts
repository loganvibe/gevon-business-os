/**
 * Snapshot builder — the single place the intelligence layer reads business
 * data from. Every query runs through the caller's RLS-scoped Supabase client,
 * so a company only ever sees its own rows, and modules that are not enabled
 * simply contribute zeros instead of failing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { BusinessSnapshot, SeriesPoint } from "../engine/types";
import { emptySnapshot } from "../engine/types";

export type Sb = SupabaseClient<Database>;

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** Resolves a named period into concrete start/end dates. */
export function resolvePeriod(
  period: "daily" | "weekly" | "monthly" | "yearly" | "custom",
  from?: string,
  to?: string,
): { start: string; end: string } {
  if (period === "custom" && from && to) return { start: from, end: to };
  const now = new Date();
  const end = isoDate(now);
  switch (period) {
    case "daily":
      return { start: end, end };
    case "weekly":
      return { start: addDays(end, -6), end };
    case "yearly":
      return { start: isoDate(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), end };
    case "monthly":
    default:
      return { start: isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), end };
  }
}

function bucketDaily(rows: Array<{ date: string | null; value: number }>): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.date) continue;
    const key = r.date.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + r.value);
  }
  return [...map.entries()]
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Builds the normalized business snapshot used by the KPI, health, forecast,
 * advisor and alert engines.
 */
export async function buildSnapshot(
  supabase: Sb,
  opts: { companyId: string; branchId?: string | null; start: string; end: string },
): Promise<BusinessSnapshot> {
  const { companyId, start, end } = opts;
  const branchId = opts.branchId ?? null;
  const span = daysBetween(start, end);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(span - 1));

  const { data: company } = await supabase
    .from("companies")
    .select("currency_code")
    .eq("id", companyId)
    .maybeSingle();
  const currency = company?.currency_code ?? "NGN";

  const snap = emptySnapshot(companyId, branchId, currency, start, end);

  // ------------------------------ SALES ---------------------------------
  const salesSelect = "id, branch_id, total, completed_at, customer_id";
  let curSalesQ = supabase
    .from("sales")
    .select(salesSelect)
    .eq("company_id", companyId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .gte("completed_at", `${start}T00:00:00Z`)
    .lte("completed_at", `${end}T23:59:59Z`);
  if (branchId) curSalesQ = curSalesQ.eq("branch_id", branchId);

  let prevSalesQ = supabase
    .from("sales")
    .select("total, customer_id, completed_at")
    .eq("company_id", companyId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .gte("completed_at", `${prevStart}T00:00:00Z`)
    .lte("completed_at", `${prevEnd}T23:59:59Z`);
  if (branchId) prevSalesQ = prevSalesQ.eq("branch_id", branchId);

  const [{ data: curSales }, { data: prevSales }] = await Promise.all([curSalesQ, prevSalesQ]);
  const cur = curSales ?? [];
  const prev = prevSales ?? [];

  snap.sales.currentRevenue = cur.reduce((s, r) => s + num(r.total), 0);
  snap.sales.currentCount = cur.length;
  snap.sales.previousRevenue = prev.reduce((s, r) => s + num(r.total), 0);
  snap.sales.previousCount = prev.length;
  snap.sales.dailySeries = bucketDaily(
    cur.map((r) => ({ date: r.completed_at, value: num(r.total) })),
  );
  const today = isoDate(new Date());
  const todayPoint = snap.sales.dailySeries.find((p) => p.date === today);
  snap.sales.todayRevenue = todayPoint?.value ?? 0;
  snap.sales.todayCount = cur.filter((r) => (r.completed_at ?? "").slice(0, 10) === today).length;

  // Top branches
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("company_id", companyId);
  const branchNames = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const byBranch = new Map<string, number>();
  for (const r of cur) {
    if (!r.branch_id) continue;
    byBranch.set(r.branch_id, (byBranch.get(r.branch_id) ?? 0) + num(r.total));
  }
  snap.sales.topBranches = [...byBranch.entries()]
    .map(([id, revenue]) => ({ id, name: branchNames.get(id) ?? "Branch", revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top products (via sale items of the current period's sales)
  const saleIds = cur.map((r) => r.id);
  if (saleIds.length) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity, total")
      .in("sale_id", saleIds.slice(0, 1000));
    const agg = new Map<string, { quantity: number; revenue: number }>();
    for (const it of items ?? []) {
      if (!it.product_id) continue;
      const row = agg.get(it.product_id) ?? { quantity: 0, revenue: 0 };
      row.quantity += num(it.quantity);
      row.revenue += num(it.total);
      agg.set(it.product_id, row);
    }
    const ids = [...agg.keys()];
    if (ids.length) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, name")
        .in("id", ids.slice(0, 500));
      const names = new Map((prods ?? []).map((p) => [p.id, p.name]));
      snap.sales.topProducts = ids
        .map((id) => ({
          id,
          name: names.get(id) ?? "Product",
          quantity: Math.round(agg.get(id)!.quantity * 100) / 100,
          revenue: Math.round(agg.get(id)!.revenue * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    }
  }

  // Customers (derived from sales until the CRM module supplies richer data)
  const curCustomers = new Set(cur.map((r) => r.customer_id).filter(Boolean) as string[]);
  const prevCustomers = new Set(prev.map((r) => r.customer_id).filter(Boolean) as string[]);
  snap.customers.total = new Set([...curCustomers, ...prevCustomers]).size;
  snap.customers.newInPeriod = [...curCustomers].filter((c) => !prevCustomers.has(c)).length;
  snap.customers.previousNew = prevCustomers.size;
  snap.customers.inactive = [...prevCustomers].filter((c) => !curCustomers.has(c)).length;

  // Outstanding orders
  let ordersQ = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["pending", "confirmed"]);
  if (branchId) ordersQ = ordersQ.eq("branch_id", branchId);
  const { count: outstanding } = await ordersQ;
  snap.sales.outstandingOrders = outstanding ?? 0;

  // ---------------------------- EXPENSES --------------------------------
  let expQ = supabase
    .from("expenses")
    .select("total, amount_paid, status, expense_date, category_id")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .neq("status", "rejected")
    .gte("expense_date", start)
    .lte("expense_date", end);
  if (branchId) expQ = expQ.eq("branch_id", branchId);

  let prevExpQ = supabase
    .from("expenses")
    .select("total")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .neq("status", "rejected")
    .gte("expense_date", prevStart)
    .lte("expense_date", prevEnd);
  if (branchId) prevExpQ = prevExpQ.eq("branch_id", branchId);

  const [{ data: expenses }, { data: prevExpenses }] = await Promise.all([expQ, prevExpQ]);
  const exp = expenses ?? [];
  snap.expenses.currentTotal = exp.reduce((s, r) => s + num(r.total), 0);
  snap.expenses.previousTotal = (prevExpenses ?? []).reduce((s, r) => s + num(r.total), 0);
  snap.expenses.unpaid = exp.reduce(
    (s, r) => s + Math.max(num(r.total) - num(r.amount_paid), 0),
    0,
  );
  snap.expenses.pendingApproval = exp.filter((r) => r.status === "pending").length;
  snap.expenses.dailySeries = bucketDaily(
    exp.map((r) => ({ date: r.expense_date, value: num(r.total) })),
  );

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("company_id", companyId);
  const catNames = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const byCat = new Map<string | null, number>();
  for (const r of exp) {
    byCat.set(r.category_id, (byCat.get(r.category_id) ?? 0) + num(r.total));
  }
  snap.expenses.byCategory = [...byCat.entries()]
    .map(([id, total]) => ({
      id,
      name: id ? (catNames.get(id) ?? "Uncategorised") : "Uncategorised",
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);

  // ---------------------------- INVENTORY -------------------------------
  let invQ = supabase
    .from("inventory_items")
    .select("product_id, quantity, reorder_point, minimum_stock_level, branch_id")
    .eq("company_id", companyId);
  if (branchId) invQ = invQ.eq("branch_id", branchId);
  const { data: inv } = await invQ;
  const invRows = inv ?? [];
  snap.inventory.trackedItems = invRows.length;
  snap.inventory.outOfStockCount = invRows.filter((r) => num(r.quantity) <= 0).length;
  snap.inventory.lowStockCount = invRows.filter((r) => {
    const threshold = num(r.reorder_point) || num(r.minimum_stock_level);
    return threshold > 0 && num(r.quantity) > 0 && num(r.quantity) <= threshold;
  }).length;

  if (invRows.length) {
    const productIds = [...new Set(invRows.map((r) => r.product_id))].slice(0, 1000);
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, cost_price")
      .in("id", productIds);
    const costs = new Map((prods ?? []).map((p) => [p.id, num(p.cost_price)]));
    const names = new Map((prods ?? []).map((p) => [p.id, p.name]));
    snap.inventory.stockValue = invRows.reduce(
      (s, r) => s + num(r.quantity) * (costs.get(r.product_id) ?? 0),
      0,
    );
    const sold = new Map(snap.sales.topProducts.map((p) => [p.id, p.quantity]));
    snap.inventory.cogs = [...sold.entries()].reduce(
      (s, [id, qty]) => s + qty * (costs.get(id) ?? 0),
      0,
    );
    snap.inventory.deadStock = invRows
      .filter((r) => num(r.quantity) > 0 && !sold.has(r.product_id))
      .slice(0, 10)
      .map((r) => ({
        id: r.product_id,
        name: names.get(r.product_id) ?? "Product",
        quantity: num(r.quantity),
      }));
  }

  // ------------------------------ PEOPLE --------------------------------
  let empQ = supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .in("status", ["active", "probation", "on_leave"]);
  if (branchId) empQ = empQ.eq("branch_id", branchId);
  const { count: headcount } = await empQ;
  snap.people.headcount = headcount ?? 0;

  const { count: pendingLeave } = await supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "pending");
  snap.people.pendingLeave = pendingLeave ?? 0;

  const { data: payroll } = await supabase
    .from("payroll_cycles")
    .select("total_net, pay_date, status")
    .eq("company_id", companyId)
    .in("status", ["draft", "processing", "pending_approval", "approved"])
    .order("pay_date", { ascending: true })
    .limit(1);
  if (payroll && payroll.length) {
    snap.people.upcomingPayrollTotal = num(payroll[0]!.total_net);
    snap.people.upcomingPayrollDate = payroll[0]!.pay_date ?? null;
  }

  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("worked_minutes")
    .eq("company_id", companyId)
    .gte("work_date", start)
    .lte("work_date", end)
    .limit(5000);
  const totalMinutes = (attendance ?? []).reduce((s, r) => s + num(r.worked_minutes), 0);
  const expectedMinutes = snap.people.headcount * span * 8 * 60 * (5 / 7);
  snap.people.overtimeHours = Math.max(0, (totalMinutes - expectedMinutes) / 60);

  // ------------------------------- CASH ---------------------------------
  const { data: payments } = await supabase
    .from("payment_records")
    .select("amount")
    .eq("company_id", companyId)
    .gte("paid_at", `${start}T00:00:00Z`)
    .lte("paid_at", `${end}T23:59:59Z`);
  snap.cash.paymentsReceived = (payments ?? []).reduce((s, r) => s + num(r.amount), 0);

  const { data: expPayments } = await supabase
    .from("expense_payments")
    .select("amount")
    .eq("company_id", companyId)
    .gte("paid_at", `${start}T00:00:00Z`)
    .lte("paid_at", `${end}T23:59:59Z`);
  snap.cash.expensePayments = (expPayments ?? []).reduce((s, r) => s + num(r.amount), 0);
  snap.cash.position = snap.cash.paymentsReceived - snap.cash.expensePayments;

  return snap;
}
