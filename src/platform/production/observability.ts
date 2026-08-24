export interface MetricEntry {
  name: string;
  value: number;
  timestamp: string;
  labels?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: "gt" | "lt" | "eq" | "gte" | "lte";
  severity: "info" | "warning" | "critical";
  enabled: boolean;
}

export const defaultAlerts: AlertRule[] = [
  { id: "failed-jobs", name: "Failed jobs", metric: "jobs.failed", threshold: 5, operator: "gte", severity: "warning", enabled: true },
  { id: "failed-events", name: "Failed events", metric: "events.failed", threshold: 10, operator: "gte", severity: "warning", enabled: true },
  { id: "failed-webhooks", name: "Failed webhooks", metric: "webhooks.failed", threshold: 3, operator: "gte", severity: "warning", enabled: true },
  { id: "auth-failures", name: "Auth failures", metric: "auth.failed", threshold: 50, operator: "gte", severity: "critical", enabled: true },
  { id: "slow-requests", name: "Slow requests", metric: "requests.slow", threshold: 1000, operator: "gte", severity: "warning", enabled: true },
  { id: "db-errors", name: "Database errors", metric: "database.errors", threshold: 5, operator: "gte", severity: "critical", enabled: true },
];

export function evaluateAlert(rule: AlertRule, value: number): boolean {
  if (!rule.enabled) return false;
  switch (rule.operator) {
    case "gt": return value > rule.threshold;
    case "lt": return value < rule.threshold;
    case "eq": return value === rule.threshold;
    case "gte": return value >= rule.threshold;
    case "lte": return value <= rule.threshold;
    default: return false;
  }
}
