/**
 * AI Business Advisor — a deterministic, rule-based intelligence engine.
 *
 * Each rule inspects the `BusinessSnapshot` and, when it fires, produces a
 * finding + a concrete recommendation. Rules are pure functions so they can be
 * unit-tested, replayed over history, and (later) re-ranked or rewritten by an
 * LLM without changing how they are detected or stored.
 */
import type {
  BusinessSnapshot,
  Recommendation,
  SmartAlert,
} from "./types";
import { pctChange } from "./kpi";

export interface AdvisorRule {
  key: string;
  moduleId: string;
  /** Returns a recommendation when the rule fires, otherwise null. */
  evaluate(s: BusinessSnapshot): Recommendation | null;
}

const money = (n: number, currency: string) =>
  `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function rec(
  s: BusinessSnapshot,
  base: Omit<Recommendation, "dedupeKey"> & { dedupeSuffix?: string },
): Recommendation {
  const { dedupeSuffix, ...rest } = base;
  return { ...rest, dedupeKey: `${base.ruleKey}:${s.branchId ?? "all"}:${dedupeSuffix ?? s.periodEnd}` };
}

export const ADVISOR_RULES: AdvisorRule[] = [
  {
    key: "sales.declining",
    moduleId: "sales",
    evaluate: (s) => {
      const change = pctChange(s.sales.currentRevenue, s.sales.previousRevenue);
      if (change === null || change > -10 || s.sales.previousRevenue <= 0) return null;
      return rec(s, {
        ruleKey: "sales.declining",
        moduleId: "sales",
        title: "Sales dropped compared to the previous period",
        finding: `Revenue fell ${Math.abs(change).toFixed(1)}% — from ${money(s.sales.previousRevenue, s.currency)} to ${money(s.sales.currentRevenue, s.currency)}.`,
        recommendation:
          "Check which products and branches lost volume, follow up with recent customers who have not returned, and run a short promotion on your top sellers.",
        impact: Math.abs(change) > 25 ? "high" : "medium",
        confidence: 85,
        severity: Math.abs(change) > 25 ? "critical" : "warning",
        data: { changePercent: change },
      });
    },
  },
  {
    key: "expenses.rising",
    moduleId: "expenses",
    evaluate: (s) => {
      const change = pctChange(s.expenses.currentTotal, s.expenses.previousTotal);
      if (change === null || change < 20 || s.expenses.previousTotal <= 0) return null;
      const top = [...s.expenses.byCategory].sort((a, b) => b.total - a.total)[0];
      return rec(s, {
        ruleKey: "expenses.rising",
        moduleId: "expenses",
        title: "Expenses increased sharply",
        finding: `Spending is up ${change.toFixed(1)}% versus the previous period${top ? `, led by ${top.name} at ${money(top.total, s.currency)}` : ""}.`,
        recommendation:
          "Review the largest categories for one-off or duplicate entries, renegotiate recurring supplier costs, and set an expense limit goal for next month.",
        impact: change > 50 ? "high" : "medium",
        confidence: 80,
        severity: change > 50 ? "critical" : "warning",
        data: { changePercent: change, topCategory: top?.name ?? null },
      });
    },
  },
  {
    key: "profit.negative",
    moduleId: "expenses",
    evaluate: (s) => {
      const profit = s.sales.currentRevenue - s.expenses.currentTotal;
      if (profit >= 0 || s.sales.currentRevenue === 0) return null;
      return rec(s, {
        ruleKey: "profit.negative",
        moduleId: "expenses",
        title: "The business is spending more than it earns",
        finding: `Expenses of ${money(s.expenses.currentTotal, s.currency)} exceed revenue of ${money(s.sales.currentRevenue, s.currency)} — a loss of ${money(Math.abs(profit), s.currency)}.`,
        recommendation:
          "Pause non-essential spending, prioritise collecting outstanding payments, and focus selling effort on your highest-margin products.",
        impact: "high",
        confidence: 90,
        severity: "critical",
        data: { profit },
      });
    },
  },
  {
    key: "inventory.low_stock",
    moduleId: "inventory",
    evaluate: (s) => {
      if (s.inventory.lowStockCount === 0 && s.inventory.outOfStockCount === 0) return null;
      return rec(s, {
        ruleKey: "inventory.low_stock",
        moduleId: "inventory",
        title: "Stock needs restocking",
        finding: `${s.inventory.lowStockCount} products are below their reorder level and ${s.inventory.outOfStockCount} are completely out of stock.`,
        recommendation:
          "Raise purchase orders for the affected products with your usual suppliers before they cost you sales this week.",
        impact: s.inventory.outOfStockCount > 0 ? "high" : "medium",
        confidence: 95,
        severity: s.inventory.outOfStockCount > 0 ? "critical" : "warning",
        data: {
          lowStockCount: s.inventory.lowStockCount,
          outOfStockCount: s.inventory.outOfStockCount,
        },
      });
    },
  },
  {
    key: "inventory.dead_stock",
    moduleId: "inventory",
    evaluate: (s) => {
      if (s.inventory.deadStock.length === 0) return null;
      const names = s.inventory.deadStock.slice(0, 3).map((p) => p.name).join(", ");
      return rec(s, {
        ruleKey: "inventory.dead_stock",
        moduleId: "inventory",
        title: "Some products are not selling",
        finding: `${s.inventory.deadStock.length} products held stock through this period without a single sale (${names}).`,
        recommendation:
          "Bundle or discount these items to free up cash, and reduce future order quantities for them.",
        impact: "medium",
        confidence: 75,
        severity: "info",
        data: { products: s.inventory.deadStock.slice(0, 10) },
      });
    },
  },
  {
    key: "branch.underperforming",
    moduleId: "sales",
    evaluate: (s) => {
      const branches = s.sales.topBranches;
      if (branches.length < 2) return null;
      const best = branches[0]!;
      const worst = branches[branches.length - 1]!;
      if (best.revenue <= 0 || worst.revenue > best.revenue * 0.4) return null;
      return rec(s, {
        ruleKey: "branch.underperforming",
        moduleId: "sales",
        title: `${worst.name} is underperforming`,
        finding: `${worst.name} made ${money(worst.revenue, s.currency)} while ${best.name} made ${money(best.revenue, s.currency)} in the same period.`,
        recommendation:
          "Compare staffing, stock availability and opening hours between the two branches, and move fast-moving stock to where it sells.",
        impact: "medium",
        confidence: 70,
        severity: "warning",
        data: { best, worst },
      });
    },
  },
  {
    key: "cashflow.unpaid_bills",
    moduleId: "expenses",
    evaluate: (s) => {
      if (s.expenses.unpaid <= 0) return null;
      if (s.expenses.unpaid < s.cash.paymentsReceived * 0.25) return null;
      return rec(s, {
        ruleKey: "cashflow.unpaid_bills",
        moduleId: "expenses",
        title: "Unpaid bills are building up",
        finding: `${money(s.expenses.unpaid, s.currency)} of recorded expenses are still unpaid against ${money(s.cash.paymentsReceived, s.currency)} received.`,
        recommendation:
          "Schedule the oldest bills first, and chase outstanding customer payments to cover them before they become overdue.",
        impact: "high",
        confidence: 80,
        severity: "warning",
        data: { unpaid: s.expenses.unpaid },
      });
    },
  },
  {
    key: "people.overtime_high",
    moduleId: "people",
    evaluate: (s) => {
      if (s.people.headcount === 0) return null;
      const perHead = s.people.overtimeHours / s.people.headcount;
      if (perHead < 10) return null;
      return rec(s, {
        ruleKey: "people.overtime_high",
        moduleId: "people",
        title: "Overtime is unusually high",
        finding: `Staff logged ${s.people.overtimeHours.toFixed(1)} overtime hours this period — about ${perHead.toFixed(1)} hours per employee.`,
        recommendation:
          "Review shift schedules and consider adding cover on the busiest days; sustained overtime raises payroll cost and turnover risk.",
        impact: "medium",
        confidence: 70,
        severity: "warning",
        data: { overtimeHours: s.people.overtimeHours, perHead },
      });
    },
  },
  {
    key: "customers.inactive",
    moduleId: "crm",
    evaluate: (s) => {
      if (s.customers.total === 0 || s.customers.inactive === 0) return null;
      const ratio = s.customers.inactive / s.customers.total;
      if (ratio < 0.3) return null;
      return rec(s, {
        ruleKey: "customers.inactive",
        moduleId: "crm",
        title: "Many customers have gone quiet",
        finding: `${s.customers.inactive} of ${s.customers.total} customers (${(ratio * 100).toFixed(0)}%) have not bought recently.`,
        recommendation:
          "Send a win-back message to the inactive list with a reason to return — a small incentive usually beats finding new customers.",
        impact: "medium",
        confidence: 65,
        severity: "info",
        data: { inactive: s.customers.inactive, total: s.customers.total },
      });
    },
  },
  {
    key: "approvals.pending",
    moduleId: "expenses",
    evaluate: (s) => {
      if (s.expenses.pendingApproval === 0 && s.people.pendingLeave === 0) return null;
      return rec(s, {
        ruleKey: "approvals.pending",
        moduleId: "expenses",
        title: "Approvals are waiting on you",
        finding: `${s.expenses.pendingApproval} expenses and ${s.people.pendingLeave} leave requests are pending approval.`,
        recommendation: "Clear the queue so spending stays controlled and staff can plan their time.",
        impact: "low",
        confidence: 100,
        severity: "info",
        data: {
          expenses: s.expenses.pendingApproval,
          leave: s.people.pendingLeave,
        },
      });
    },
  },
];

/** Runs every rule and returns the recommendations that fired, worst first. */
export function generateRecommendations(s: BusinessSnapshot): Recommendation[] {
  const order = { high: 0, medium: 1, low: 2 } as const;
  return ADVISOR_RULES.map((r) => r.evaluate(s))
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => order[a.impact] - order[b.impact] || b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Smart alerts — short, actionable, deduplicated signals for the Alerts Center.
// ---------------------------------------------------------------------------

export function generateAlerts(s: BusinessSnapshot): SmartAlert[] {
  const out: SmartAlert[] = [];
  const suffix = `${s.branchId ?? "all"}`;

  if (s.inventory.lowStockCount > 0 || s.inventory.outOfStockCount > 0) {
    out.push({
      alertKey: "inventory.low_stock",
      moduleId: "inventory",
      severity: s.inventory.outOfStockCount > 0 ? "critical" : "warning",
      title: "Stock running low",
      message: `${s.inventory.lowStockCount} products are low and ${s.inventory.outOfStockCount} are out of stock.`,
      deepLink: "/app/inventory",
      data: { low: s.inventory.lowStockCount, out: s.inventory.outOfStockCount },
      dedupeKey: `inventory.low_stock:${suffix}`,
    });
  }

  const expChange = pctChange(s.expenses.currentTotal, s.expenses.previousTotal);
  if (expChange !== null && expChange > 30 && s.expenses.previousTotal > 0) {
    out.push({
      alertKey: "expenses.spike",
      moduleId: "expenses",
      severity: "warning",
      title: "Expenses unusually high",
      message: `Spending is ${expChange.toFixed(0)}% above the previous period.`,
      deepLink: "/app/expenses",
      data: { changePercent: expChange },
      dedupeKey: `expenses.spike:${suffix}:${s.periodEnd.slice(0, 7)}`,
    });
  }

  const salesChange = pctChange(s.sales.currentRevenue, s.sales.previousRevenue);
  if (salesChange !== null && salesChange < -20 && s.sales.previousRevenue > 0) {
    out.push({
      alertKey: "sales.slump",
      moduleId: "sales",
      severity: "critical",
      title: "Sales unusually low",
      message: `Revenue is ${Math.abs(salesChange).toFixed(0)}% below the previous period.`,
      deepLink: "/app/sales",
      data: { changePercent: salesChange },
      dedupeKey: `sales.slump:${suffix}:${s.periodEnd.slice(0, 7)}`,
    });
  }

  if (s.customers.total > 0 && s.customers.inactive / s.customers.total >= 0.3) {
    out.push({
      alertKey: "customers.inactive",
      moduleId: "crm",
      severity: "info",
      title: "Inactive customers",
      message: `${s.customers.inactive} customers have not bought recently.`,
      deepLink: "/app/advisor",
      data: { inactive: s.customers.inactive },
      dedupeKey: `customers.inactive:${suffix}`,
    });
  }

  if (s.expenses.pendingApproval > 0 || s.people.pendingLeave > 0) {
    out.push({
      alertKey: "approvals.overdue",
      moduleId: "core",
      severity: "info",
      title: "Approvals waiting",
      message: `${s.expenses.pendingApproval} expenses and ${s.people.pendingLeave} leave requests need a decision.`,
      deepLink: "/app/expenses?status=pending",
      data: { expenses: s.expenses.pendingApproval, leave: s.people.pendingLeave },
      dedupeKey: `approvals.overdue:${suffix}`,
    });
  }

  if (s.people.upcomingPayrollTotal > 0) {
    out.push({
      alertKey: "payroll.upcoming",
      moduleId: "people",
      severity: s.cash.position < s.people.upcomingPayrollTotal ? "warning" : "info",
      title: "Upcoming payroll",
      message: `Payroll of ${money(s.people.upcomingPayrollTotal, s.currency)} is due${s.people.upcomingPayrollDate ? ` on ${s.people.upcomingPayrollDate}` : ""}.`,
      deepLink: "/app/people",
      data: { total: s.people.upcomingPayrollTotal, date: s.people.upcomingPayrollDate },
      dedupeKey: `payroll.upcoming:${suffix}:${s.people.upcomingPayrollDate ?? s.periodEnd}`,
    });
  }

  if (s.expenses.unpaid > 0) {
    out.push({
      alertKey: "suppliers.unpaid",
      moduleId: "expenses",
      severity: "info",
      title: "Unpaid supplier bills",
      message: `${money(s.expenses.unpaid, s.currency)} of expenses are still outstanding.`,
      deepLink: "/app/expenses",
      data: { unpaid: s.expenses.unpaid },
      dedupeKey: `suppliers.unpaid:${suffix}`,
    });
  }

  return out;
}
