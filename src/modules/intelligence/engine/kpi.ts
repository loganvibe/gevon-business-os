/**
 * KPI Engine — pure calculations over a `BusinessSnapshot`.
 * Every KPI is derived here so the dashboard, reports, health score and
 * advisor all agree on the same numbers.
 */
import type { BusinessSnapshot, KpiValue, Trend } from "./types";

export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function trendOf(change: number | null, higherIsBetter: boolean): Trend {
  if (change === null || Math.abs(change) < 1) return "flat";
  const rising = change > 0;
  return rising === higherIsBetter ? "up" : "down";
}

function kpi(
  key: string,
  label: string,
  unit: KpiValue["unit"],
  value: number,
  previousValue: number | null,
  higherIsBetter = true,
  meta: Record<string, unknown> = {},
): KpiValue {
  const changePercent = previousValue === null ? null : pctChange(value, previousValue);
  return {
    key,
    label,
    unit,
    value: round(value),
    previousValue: previousValue === null ? null : round(previousValue),
    changePercent: changePercent === null ? null : Math.round(changePercent * 100) / 100,
    trend: trendOf(changePercent, higherIsBetter),
    higherIsBetter,
    meta,
  };
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((Number(n) || 0) * f) / f;
}

/** The canonical KPI set for every Gevon business. */
export function computeKpis(s: BusinessSnapshot): KpiValue[] {
  const revenue = s.sales.currentRevenue;
  const prevRevenue = s.sales.previousRevenue;
  const expenses = s.expenses.currentTotal;
  const prevExpenses = s.expenses.previousTotal;
  const profit = revenue - expenses;
  const prevProfit = prevRevenue - prevExpenses;

  const aov = s.sales.currentCount ? revenue / s.sales.currentCount : 0;
  const prevAov = s.sales.previousCount ? prevRevenue / s.sales.previousCount : 0;

  const turnover = s.inventory.stockValue > 0 ? s.inventory.cogs / s.inventory.stockValue : 0;

  const productivity = s.people.headcount > 0 ? revenue / s.people.headcount : 0;

  return [
    kpi("revenue", "Revenue", "currency", revenue, prevRevenue),
    kpi("profit", "Estimated profit", "currency", profit, prevProfit),
    kpi("expenses", "Expenses", "currency", expenses, prevExpenses, false),
    kpi(
      "sales_growth",
      "Sales growth",
      "percent",
      pctChange(revenue, prevRevenue) ?? 0,
      null,
      true,
      { basis: "revenue vs previous period" },
    ),
    kpi("inventory_turnover", "Inventory turnover", "ratio", turnover, null, true, {
      cogs: round(s.inventory.cogs),
      stockValue: round(s.inventory.stockValue),
    }),
    kpi("customer_growth", "New customers", "count", s.customers.newInPeriod, s.customers.previousNew),
    kpi("average_order_value", "Average order value", "currency", aov, prevAov || null),
    kpi("employee_productivity", "Revenue per employee", "currency", productivity, null, true, {
      headcount: s.people.headcount,
    }),
    kpi("outstanding_orders", "Outstanding orders", "count", s.sales.outstandingOrders, null, false),
    kpi("cash_position", "Cash position", "currency", s.cash.position, null),
    kpi("gross_margin", "Margin", "percent", revenue > 0 ? (profit / revenue) * 100 : 0, null),
  ];
}

export function kpiByKey(kpis: KpiValue[]): Record<string, KpiValue> {
  return Object.fromEntries(kpis.map((k) => [k.key, k]));
}
