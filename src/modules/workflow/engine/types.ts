/**
 * Workflow & Automation Engine — shared types (Milestone 10).
 * -----------------------------------------------------------
 * The engine is deliberately GENERIC: modules never hard-code workflows.
 * A workflow is `TRIGGER (event key) -> CONDITIONS -> ACTIONS`, where every
 * action is one of a fixed, audited catalogue. There is NO arbitrary code
 * execution: user configuration only selects an action type and fills a
 * validated config object.
 */
import { z } from "zod";

// ------------------------------- Conditions ---------------------------
export const CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "not_contains",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const ConditionSchema = z.object({
  /** Dot path into the event payload, e.g. `quantity` or `branch.id`. */
  field: z.string().min(1).max(120),
  op: z.enum(CONDITION_OPERATORS),
  value: z.unknown().optional(),
});
export type WorkflowCondition = z.infer<typeof ConditionSchema>;

export const ConditionLogicSchema = z.enum(["all", "any"]);
export type ConditionLogic = z.infer<typeof ConditionLogicSchema>;

// -------------------------------- Actions -----------------------------
export const ACTION_TYPES = [
  "create_task",
  "send_notification",
  "queue_email",
  "create_approval",
  "create_alert",
  "assign_user",
  "assign_team",
  "publish_event",
  "create_reminder",
  "create_request",
  "update_record",
] as const;
export type WorkflowActionType = (typeof ACTION_TYPES)[number];

export const AssigneeKindSchema = z.enum([
  "user",
  "role",
  "department",
  "branch",
  "manager",
  "team",
  "creator",
]);

const RecipientSchema = z.enum(["company.owners", "user", "workflow.owner", "payload.userId"]);

export const ActionConfigSchemas: Record<WorkflowActionType, z.ZodTypeAny> = {
  create_task: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    dueInHours: z.number().int().min(0).max(24 * 365).optional(),
    assigneeKind: AssigneeKindSchema.default("user"),
    assignedUserId: z.string().uuid().optional(),
    assignedRoleId: z.string().uuid().optional(),
    assignedDepartmentId: z.string().uuid().optional(),
    relatedModule: z.string().max(40).optional(),
  }),
  send_notification: z.object({
    title: z.string().min(1).max(160),
    message: z.string().max(1000).default(""),
    category: z
      .enum(["system", "business", "security", "ai", "billing", "modules"])
      .default("business"),
    priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
    recipient: RecipientSchema.default("company.owners"),
    userId: z.string().uuid().optional(),
    deepLink: z.string().max(300).optional(),
  }),
  queue_email: z.object({
    templateKey: z.string().min(1).max(80),
    recipient: RecipientSchema.default("company.owners"),
    userId: z.string().uuid().optional(),
    category: z
      .enum(["system", "business", "security", "ai", "billing", "modules"])
      .default("business"),
  }),
  create_approval: z.object({
    subject: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    requiredPermission: z.string().max(80).optional(),
    approverKind: AssigneeKindSchema.default("role"),
    approverUserId: z.string().uuid().optional(),
    approverRoleId: z.string().uuid().optional(),
    dueInHours: z.number().int().min(1).max(24 * 90).optional(),
  }),
  create_alert: z.object({
    title: z.string().min(1).max(160),
    message: z.string().max(1000).default(""),
    severity: z.enum(["info", "warning", "critical"]).default("warning"),
    alertKey: z.string().max(80).default("workflow.alert"),
    deepLink: z.string().max(300).optional(),
  }),
  assign_user: z.object({
    userId: z.string().uuid(),
    /** Defaults to the task created earlier in this run. */
    taskId: z.string().uuid().optional(),
  }),
  assign_team: z.object({
    departmentId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
  }),
  publish_event: z.object({
    key: z.string().min(1).max(80),
    payload: z.record(z.string(), z.unknown()).default({}),
  }),
  create_reminder: z.object({
    title: z.string().min(1).max(160),
    message: z.string().max(1000).optional(),
    inHours: z.number().min(0).max(24 * 365).default(24),
    recipientUserId: z.string().uuid().optional(),
    deepLink: z.string().max(300).optional(),
  }),
  create_request: z.object({
    requestType: z
      .enum(["purchase", "expense", "leave", "stock_adjustment", "maintenance", "staff", "other"])
      .default("other"),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    amount: z.number().nonnegative().optional(),
  }),
  update_record: z.object({
    /** Strict allow-list: workflows may never touch arbitrary tables. */
    table: z.enum(["tasks", "internal_requests", "approval_requests"]),
    id: z.string().uuid().optional(),
    status: z.string().min(1).max(40),
  }),
};

/**
 * Permission required for each action. The engine checks this against the
 * workflow OWNER — a workflow can never perform something its author could
 * not do by hand.
 */
export const ACTION_PERMISSION: Record<WorkflowActionType, string | null> = {
  create_task: "task.create",
  send_notification: null,
  queue_email: null,
  create_approval: "approval.manage",
  create_alert: "bi.alerts.manage",
  assign_user: "task.assign",
  assign_team: "task.assign",
  publish_event: "workflow.execute",
  create_reminder: "task.create",
  create_request: "request.create",
  update_record: "workflow.execute",
};

export const ACTION_LABELS: Record<WorkflowActionType, string> = {
  create_task: "Create a task",
  send_notification: "Send a notification",
  queue_email: "Send an email",
  create_approval: "Request an approval",
  create_alert: "Raise an alert",
  assign_user: "Assign to a person",
  assign_team: "Assign to a department",
  publish_event: "Publish an event",
  create_reminder: "Create a reminder",
  create_request: "Create an internal request",
  update_record: "Update a record status",
};

export function parseActionConfig(type: WorkflowActionType, config: unknown) {
  const schema = ActionConfigSchemas[type];
  if (!schema) throw new Error(`Unknown workflow action: ${type}`);
  return schema.parse(config ?? {});
}
