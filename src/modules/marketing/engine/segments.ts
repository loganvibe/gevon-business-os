/**
 * Customer Segmentation Engine (Milestone 11).
 * --------------------------------------------
 * Segments are declarative: a saved set of conditions over customer
 * attributes and purchase behaviour. There is NO arbitrary SQL — every
 * condition names a whitelisted field and a whitelisted operator, and the
 * engine translates it into a PostgREST filter applied on top of the
 * caller's RLS-scoped client. That keeps tenant isolation intact and makes
 * dynamic segments cheap to re-evaluate.
 */
import { z } from "zod";

/** Whitelisted, business-meaningful customer fields. */
export const SEGMENT_FIELDS = [
  "total_spent",
  "purchase_count",
  "days_since_last_purchase",
  "days_since_first_purchase",
  "days_since_created",
  "customer_type",
  "status",
  "city",
  "state",
  "country_code",
  "branch_id",
  "tags",
] as const;
export type SegmentField = (typeof SEGMENT_FIELDS)[number];

export const SEGMENT_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;
export type SegmentOperator = (typeof SEGMENT_OPERATORS)[number];

export const SegmentConditionSchema = z.object({
  field: z.enum(SEGMENT_FIELDS),
  op: z.enum(SEGMENT_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});
export type SegmentCondition = z.infer<typeof SegmentConditionSchema>;

export const SegmentRulesSchema = z.object({
  logic: z.enum(["all", "any"]).default("all"),
  conditions: z.array(SegmentConditionSchema).max(20).default([]),
});
export type SegmentRules = z.infer<typeof SegmentRulesSchema>;

export const EMPTY_RULES: SegmentRules = { logic: "all", conditions: [] };

/** Fields expressed as "days ago" map onto a timestamp column. */
const DAY_FIELDS: Record<string, string> = {
  days_since_last_purchase: "last_purchase_at",
  days_since_first_purchase: "first_purchase_at",
  days_since_created: "created_at",
};

/** Inverts a numeric operator when converting "days ago" to a timestamp. */
const INVERT: Record<string, string> = { gt: "lt", gte: "lte", lt: "gt", lte: "gte", eq: "eq", neq: "neq" };

export interface PostgrestFilter {
  column: string;
  operator: string;
  value: unknown;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Translates a single condition into a PostgREST filter descriptor. */
export function toFilter(cond: SegmentCondition): PostgrestFilter | null {
  const { field, op } = cond;
  const value = cond.value;

  if (field in DAY_FIELDS) {
    const column = DAY_FIELDS[field]!;
    if (op === "is_empty") return { column, operator: "is", value: null };
    if (op === "is_not_empty") return { column, operator: "not.is", value: null };
    const days = Number(value);
    if (!Number.isFinite(days)) return null;
    // "purchased in the last 30 days" -> days_since_last_purchase lte 30
    //  -> last_purchase_at gte (now - 30d)
    const inverted = INVERT[op];
    if (!inverted) return null;
    return { column, operator: inverted, value: daysAgoIso(days) };
  }

  if (field === "tags") {
    if (op === "contains" || op === "eq") {
      const arr = Array.isArray(value) ? value : [String(value ?? "")];
      return { column: "tags", operator: "cs", value: arr };
    }
    if (op === "in") {
      const arr = Array.isArray(value) ? value : [String(value ?? "")];
      return { column: "tags", operator: "ov", value: arr };
    }
    return null;
  }

  switch (op) {
    case "eq":
    case "neq":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return { column: field, operator: op, value };
    case "in":
      return { column: field, operator: "in", value: Array.isArray(value) ? value : [value] };
    case "contains":
      return { column: field, operator: "ilike", value: `%${String(value ?? "")}%` };
    case "is_empty":
      return { column: field, operator: "is", value: null };
    case "is_not_empty":
      return { column: field, operator: "not.is", value: null };
    default:
      return null;
  }
}

/** Builds the full filter set for a rule group. */
export function buildFilters(rules: SegmentRules): {
  logic: "all" | "any";
  filters: PostgrestFilter[];
} {
  const filters = rules.conditions
    .map(toFilter)
    .filter((f): f is PostgrestFilter => f !== null);
  return { logic: rules.logic, filters };
}

/** Renders a rule group as an `or=(...)` PostgREST expression. */
export function toOrExpression(filters: PostgrestFilter[]): string {
  return filters
    .map((f) => {
      const v = Array.isArray(f.value)
        ? `(${f.value.map((x) => String(x)).join(",")})`
        : f.value === null
          ? "null"
          : String(f.value);
      return `${f.column}.${f.operator}.${v}`;
    })
    .join(",");
}

/** Human-readable summary used in the UI so owners understand a segment. */
export function describeRules(rules: SegmentRules): string {
  if (!rules.conditions.length) return "All customers";
  const join = rules.logic === "all" ? " and " : " or ";
  return rules.conditions
    .map((c) => `${c.field.replace(/_/g, " ")} ${c.op.replace(/_/g, " ")} ${String(c.value ?? "")}`.trim())
    .join(join);
}

/** Ready-made segments every business understands, offered as presets. */
export const SEGMENT_PRESETS: Array<{ name: string; description: string; rules: SegmentRules }> = [
  {
    name: "Recent customers",
    description: "Bought in the last 30 days",
    rules: { logic: "all", conditions: [{ field: "days_since_last_purchase", op: "lte", value: 30 }] },
  },
  {
    name: "Lapsed customers",
    description: "No purchase in 60 days",
    rules: { logic: "all", conditions: [{ field: "days_since_last_purchase", op: "gt", value: 60 }] },
  },
  {
    name: "High-value customers",
    description: "Lifetime spend above 100,000",
    rules: { logic: "all", conditions: [{ field: "total_spent", op: "gte", value: 100000 }] },
  },
  {
    name: "New customers",
    description: "Added in the last 30 days",
    rules: { logic: "all", conditions: [{ field: "days_since_created", op: "lte", value: 30 }] },
  },
  {
    name: "Repeat customers",
    description: "More than one purchase",
    rules: { logic: "all", conditions: [{ field: "purchase_count", op: "gte", value: 2 }] },
  },
];
