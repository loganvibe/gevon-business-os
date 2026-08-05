/**
 * Business Health Score engine.
 * Scores seven areas 0-100, weights them into an overall score, and explains
 * every point gained or lost so the owner never sees an unexplained number.
 * Weights are configurable so a service business can de-emphasise inventory.
 */
import type {
  BusinessSnapshot,
  HealthArea,
  HealthAreaScore,
  HealthFactor,
  HealthScoreResult,
} from "./types";
import { pctChange } from "./kpi";

export type HealthWeights = Record<HealthArea, number>;

export const DEFAULT_WEIGHTS: HealthWeights = {
  sales: 0.25,
  inventory: 0.12,
  expenses: 0.15,
  cashflow: 0.2,
  staff: 0.1,
  customers: 0.1,
  growth: 0.08,
};

const LABELS: Record<HealthArea, string> = {
  sales: "Sales",
  inventory: "Inventory",
  expenses: "Expenses",
  cashflow: "Cash flow",
  staff: "Staff",
  customers: "Customers",
  growth: "Growth",
};

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export function calculateHealthScore(
  s: BusinessSnapshot,
  weights: Partial<HealthWeights> = {},
): HealthScoreResult {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const factors: HealthFactor[] = [];
  const areas: HealthAreaScore[] = [];

  const add = (area: HealthArea, score: number, summary: string) =>
    areas.push({ area, label: LABELS[area], score: Math.round(clamp(score)), weight: w[area], summary });

  // ---------------- Sales ----------------
  {
    const growth = pctChange(s.sales.currentRevenue, s.sales.previousRevenue) ?? 0;
    let score = 50 + growth; // +1 point per 1% growth
    if (s.sales.currentRevenue === 0) score = 10;
    score = clamp(score);
    add(
      "sales",
      score,
      s.sales.currentRevenue === 0
        ? "No completed sales recorded in this period."
        : `${growth >= 0 ? "Up" : "Down"} ${Math.abs(growth).toFixed(1)}% versus the previous period.`,
    );
    factors.push({
      area: "sales",
      label: "Revenue trend",
      detail: `Revenue ${s.sales.currentRevenue.toFixed(2)} vs ${s.sales.previousRevenue.toFixed(2)} previously.`,
      delta: Math.round(growth),
    });
  }

  // ---------------- Inventory ----------------
  {
    const tracked = s.inventory.trackedItems;
    let score = 75;
    if (tracked > 0) {
      const lowRatio = s.inventory.lowStockCount / tracked;
      const outRatio = s.inventory.outOfStockCount / tracked;
      score = clamp(100 - lowRatio * 60 - outRatio * 80);
    }
    add(
      "inventory",
      score,
      tracked === 0
        ? "No tracked stock — inventory is not affecting this score."
        : `${s.inventory.lowStockCount} low and ${s.inventory.outOfStockCount} out of stock of ${tracked} items.`,
    );
    if (s.inventory.outOfStockCount > 0) {
      factors.push({
        area: "inventory",
        label: "Out of stock items",
        detail: `${s.inventory.outOfStockCount} products cannot be sold right now.`,
        delta: -Math.min(30, s.inventory.outOfStockCount * 3),
      });
    }
  }

  // ---------------- Expenses ----------------
  {
    const revenue = s.sales.currentRevenue;
    const ratio = revenue > 0 ? s.expenses.currentTotal / revenue : s.expenses.currentTotal > 0 ? 1.5 : 0;
    // 0.5 expense ratio ≈ 80, 1.0 ≈ 40, >1.2 ≈ poor
    let score = clamp(110 - ratio * 70);
    if (revenue === 0 && s.expenses.currentTotal === 0) score = 60;
    const growth = pctChange(s.expenses.currentTotal, s.expenses.previousTotal) ?? 0;
    if (growth > 20) score = clamp(score - 10);
    add("expenses", score, `Spending is ${(ratio * 100).toFixed(0)}% of revenue this period.`);
    if (growth > 20) {
      factors.push({
        area: "expenses",
        label: "Rising costs",
        detail: `Expenses grew ${growth.toFixed(1)}% versus the previous period.`,
        delta: -10,
      });
    }
  }

  // ---------------- Cash flow ----------------
  {
    const inflow = s.cash.paymentsReceived;
    const outflow = s.cash.expensePayments;
    const net = inflow - outflow;
    let score = 50;
    if (inflow + outflow > 0) score = clamp(50 + (net / Math.max(inflow, outflow, 1)) * 50);
    if (s.expenses.unpaid > inflow && s.expenses.unpaid > 0) score = clamp(score - 15);
    add(
      "cashflow",
      score,
      `${net >= 0 ? "Positive" : "Negative"} net cash of ${net.toFixed(2)} this period.`,
    );
    if (s.expenses.unpaid > 0) {
      factors.push({
        area: "cashflow",
        label: "Unpaid bills",
        detail: `${s.expenses.unpaid.toFixed(2)} of recorded expenses are still unpaid.`,
        delta: -15,
      });
    }
  }

  // ---------------- Staff ----------------
  {
    let score = s.people.headcount === 0 ? 60 : 80;
    if (s.people.pendingLeave > 0) score -= Math.min(15, s.people.pendingLeave * 3);
    if (s.people.overtimeHours > 40 * Math.max(1, s.people.headcount) * 0.2) score -= 10;
    if (s.people.headcount > 0 && s.sales.currentRevenue > 0) {
      const perHead = s.sales.currentRevenue / s.people.headcount;
      if (perHead < 1000) score -= 10;
    }
    add(
      "staff",
      clamp(score),
      s.people.headcount === 0
        ? "No employees recorded yet."
        : `${s.people.headcount} employees, ${s.people.pendingLeave} leave requests waiting.`,
    );
  }

  // ---------------- Customers ----------------
  {
    const total = s.customers.total;
    let score = total === 0 ? 40 : 70;
    const growth = pctChange(s.customers.newInPeriod, s.customers.previousNew) ?? 0;
    score += clamp(growth / 4, -20, 20);
    if (total > 0) score -= clamp((s.customers.inactive / total) * 40, 0, 30);
    add(
      "customers",
      clamp(score),
      total === 0
        ? "No customer records yet."
        : `${s.customers.newInPeriod} new customers, ${s.customers.inactive} inactive.`,
    );
  }

  // ---------------- Growth ----------------
  {
    const revGrowth = pctChange(s.sales.currentRevenue, s.sales.previousRevenue) ?? 0;
    const orderGrowth = pctChange(s.sales.currentCount, s.sales.previousCount) ?? 0;
    const score = clamp(50 + revGrowth * 0.6 + orderGrowth * 0.4);
    add("growth", score, `Revenue ${revGrowth.toFixed(1)}% and volume ${orderGrowth.toFixed(1)}% versus last period.`);
  }

  const totalWeight = areas.reduce((sum, a) => sum + a.weight, 0) || 1;
  const overall = areas.reduce((sum, a) => sum + a.score * a.weight, 0) / totalWeight;
  const overallScore = Math.round(overall * 100) / 100;

  return { overallScore, grade: gradeOf(overallScore), areas, factors };
}

export function gradeOf(score: number): HealthScoreResult["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
