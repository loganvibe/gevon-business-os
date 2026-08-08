/**
 * Condition evaluation for the workflow / automation engine.
 * Pure, dependency-free and side-effect free so it can be unit tested and
 * safely reused by both the workflow runner and the automation runner.
 */
import type { ConditionLogic, WorkflowCondition } from "./types";

/** Read a dot path out of an object without throwing. */
export function readPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as any)[key]), source);
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(",").map((s) => s.trim());
  return v == null ? [] : [v];
}

export function evaluateCondition(condition: WorkflowCondition, payload: unknown): boolean {
  const actual = readPath(payload, condition.field);
  const expected = condition.value;

  switch (condition.op) {
    case "eq":
      return String(actual ?? "") === String(expected ?? "");
    case "neq":
      return String(actual ?? "") !== String(expected ?? "");
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toNumber(actual);
      const b = toNumber(expected);
      if (a == null || b == null) return false;
      if (condition.op === "gt") return a > b;
      if (condition.op === "gte") return a >= b;
      if (condition.op === "lt") return a < b;
      return a <= b;
    }
    case "contains":
      return String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "not_contains":
      return !String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "in":
      return toArray(expected).map(String).includes(String(actual ?? ""));
    case "not_in":
      return !toArray(expected).map(String).includes(String(actual ?? ""));
    case "is_empty":
      return actual == null || actual === "" || (Array.isArray(actual) && actual.length === 0);
    case "is_not_empty":
      return !(actual == null || actual === "" || (Array.isArray(actual) && actual.length === 0));
    case "is_true":
      return actual === true || actual === "true";
    case "is_false":
      return actual === false || actual === "false";
    default:
      return false;
  }
}

export function evaluateConditions(
  conditions: WorkflowCondition[],
  logic: ConditionLogic,
  payload: unknown,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return logic === "any"
    ? conditions.some((c) => evaluateCondition(c, payload))
    : conditions.every((c) => evaluateCondition(c, payload));
}

/** Interpolate `{{path}}` placeholders from the event payload. */
export function interpolate(template: string, payload: unknown): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = readPath(payload, key);
    return v == null ? "" : String(v);
  });
}
