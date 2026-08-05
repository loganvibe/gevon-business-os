/**
 * Milestone 9 — Business Intelligence & AI Decision Engine
 * --------------------------------------------------------
 * Shared, dependency-free types for the analytics / KPI / forecast /
 * advisor pipelines. Everything in `engine/` is pure TypeScript: no
 * Supabase, no network, no React. That keeps the intelligence layer
 * unit-testable and reusable from server functions, jobs, and (later)
 * LLM tool calls.
 */

export type Trend = "up" | "down" | "flat";

export type KpiUnit = "currency" | "count" | "percent" | "ratio" | "days";

export interface KpiValue {
  key: string;
  label: string;
  unit: KpiUnit;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
  trend: Trend;
  /** True when a higher number is better (revenue) vs worse (expenses). */
  higherIsBetter: boolean;
  meta?: Record<string, any>;
}

export type HealthArea =
  | "sales"
  | "inventory"
  | "expenses"
  | "cashflow"
  | "staff"
  | "customers"
  | "growth";

export interface HealthAreaScore {
  area: HealthArea;
  label: string;
  score: number; // 0..100
  weight: number; // 0..1
  summary: string;
}

export interface HealthFactor {
  area: HealthArea;
  label: string;
  detail: string;
  delta: number; // positive = helped the score, negative = hurt it
}

export interface HealthScoreResult {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  areas: HealthAreaScore[];
  factors: HealthFactor[];
}

export interface SeriesPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  value: number;
}

export interface ForecastPoint extends SeriesPoint {
  lower: number;
  upper: number;
}

export interface ForecastResult {
  method: "moving_average" | "linear_regression" | "seasonal_naive";
  points: ForecastPoint[];
  projectedTotal: number;
  confidence: number; // 0..100
  meta: Record<string, any>;
}

/** A reusable prediction interface — swap implementations without callers changing. */
export interface Forecaster {
  readonly method: ForecastResult["method"];
  forecast(history: SeriesPoint[], horizonDays: number): ForecastResult;
}

export type ImpactLevel = "low" | "medium" | "high";
export type Severity = "info" | "warning" | "critical";

export interface Recommendation {
  ruleKey: string;
  moduleId: string;
  title: string;
  finding: string;
  recommendation: string;
  impact: ImpactLevel;
  confidence: number;
  severity: Severity;
  data: Record<string, any>;
  dedupeKey: string;
}

export interface SmartAlert {
  alertKey: string;
  moduleId: string;
  severity: Severity;
  title: string;
  message: string;
  deepLink?: string;
  data: Record<string, any>;
  dedupeKey: string;
}

/**
 * The normalized snapshot of a business that every engine consumes.
 * Built once per refresh by `api/datasource.ts`, then handed to the pure
 * calculators below. Adding a new module means extending this shape only.
 */
export interface BusinessSnapshot {
  companyId: string;
  branchId: string | null;
  currency: string;
  periodStart: string;
  periodEnd: string;

  sales: {
    currentRevenue: number;
    previousRevenue: number;
    currentCount: number;
    previousCount: number;
    todayRevenue: number;
    todayCount: number;
    outstandingOrders: number;
    dailySeries: SeriesPoint[];
    topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
    topBranches: Array<{ id: string; name: string; revenue: number }>;
    topCustomers: Array<{ name: string; revenue: number }>;
  };

  expenses: {
    currentTotal: number;
    previousTotal: number;
    unpaid: number;
    pendingApproval: number;
    dailySeries: SeriesPoint[];
    byCategory: Array<{ id: string | null; name: string; total: number }>;
  };

  inventory: {
    trackedItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    stockValue: number;
    cogs: number;
    deadStock: Array<{ id: string; name: string; quantity: number }>;
  };

  people: {
    headcount: number;
    pendingLeave: number;
    upcomingPayrollTotal: number;
    upcomingPayrollDate: string | null;
    overtimeHours: number;
  };

  customers: {
    total: number;
    newInPeriod: number;
    previousNew: number;
    inactive: number;
  };

  cash: {
    paymentsReceived: number;
    expensePayments: number;
    position: number;
  };
}

/** Convenience: an empty snapshot so modules that are disabled read as zero. */
export function emptySnapshot(
  companyId: string,
  branchId: string | null,
  currency: string,
  periodStart: string,
  periodEnd: string,
): BusinessSnapshot {
  return {
    companyId,
    branchId,
    currency,
    periodStart,
    periodEnd,
    sales: {
      currentRevenue: 0,
      previousRevenue: 0,
      currentCount: 0,
      previousCount: 0,
      todayRevenue: 0,
      todayCount: 0,
      outstandingOrders: 0,
      dailySeries: [],
      topProducts: [],
      topBranches: [],
      topCustomers: [],
    },
    expenses: {
      currentTotal: 0,
      previousTotal: 0,
      unpaid: 0,
      pendingApproval: 0,
      dailySeries: [],
      byCategory: [],
    },
    inventory: {
      trackedItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      stockValue: 0,
      cogs: 0,
      deadStock: [],
    },
    people: {
      headcount: 0,
      pendingLeave: 0,
      upcomingPayrollTotal: 0,
      upcomingPayrollDate: null,
      overtimeHours: 0,
    },
    customers: { total: 0, newInPeriod: 0, previousNew: 0, inactive: 0 },
    cash: { paymentsReceived: 0, expensePayments: 0, position: 0 },
  };
}
