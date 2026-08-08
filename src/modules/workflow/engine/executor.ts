/**
 * Workflow executor — SERVER ONLY.
 *
 * Invoked by the event dispatcher for every dispatched platform event, and by
 * the job runner for escalations / reminders. It leases matching workflows,
 * evaluates conditions and executes the ordered action list.
 *
 * Security invariants:
 *  - No arbitrary code execution: actions come from a fixed catalogue.
 *  - Every action is permission-checked against the WORKFLOW OWNER, so a
 *    workflow can never perform something its author could not do manually.
 *  - Every run is recorded in `workflow_runs` (idempotency key = event id),
 *    so failed runs can be retried safely.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateConditions, interpolate, readPath } from "./conditions";
import {
  ACTION_PERMISSION,
  parseActionConfig,
  type WorkflowActionType,
  type WorkflowCondition,
} from "./types";

type Admin = SupabaseClient<any, any, any>;

export interface EventContext {
  id?: string | null;
  event_key: string;
  company_id: string | null;
  payload: Record<string, any>;
}

interface RunContext {
  admin: Admin;
  companyId: string;
  ownerUserId: string | null;
  payload: Record<string, any>;
  eventKey: string;
  /** Last created task, used by assign_* / update_record when no id given. */
  lastTaskId?: string;
  lastApprovalId?: string;
  lastRequestId?: string;
}

// ------------------------- permission helpers -------------------------
const permCache = new Map<string, Set<string>>();

export async function userPermissions(
  admin: Admin,
  companyId: string,
  userId: string,
): Promise<Set<string>> {
  const cacheKey = `${companyId}:${userId}`;
  const cached = permCache.get(cacheKey);
  if (cached) return cached;

  const set = new Set<string>();
  const { data: member } = await admin
    .from("company_members")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) {
    permCache.set(cacheKey, set);
    return set;
  }
  const { data: roles } = await admin
    .from("member_roles")
    .select("role_id")
    .eq("member_id", (member as any).id);
  const roleIds = ((roles as any[]) ?? []).map((r) => r.role_id);
  if (roleIds.length) {
    const { data: perms } = await admin
      .from("role_permissions")
      .select("permission_key")
      .in("role_id", roleIds);
    for (const p of (perms as any[]) ?? []) set.add(p.permission_key);
  }
  permCache.set(cacheKey, set);
  return set;
}

async function ownerMay(ctx: RunContext, permission: string | null): Promise<boolean> {
  if (!permission) return true;
  if (!ctx.ownerUserId) return false;
  const perms = await userPermissions(ctx.admin, ctx.companyId, ctx.ownerUserId);
  return perms.has(permission);
}

async function companyOwnerIds(admin: Admin, companyId: string): Promise<string[]> {
  const { data } = await admin
    .from("member_roles")
    .select("member:company_members!inner(user_id, company_id, status), role:roles!inner(key)")
    .eq("role.key", "owner")
    .eq("member.company_id", companyId)
    .eq("member.status", "active");
  return ((data as any[]) ?? []).map((r) => r.member?.user_id).filter(Boolean);
}

async function resolveRecipients(ctx: RunContext, cfg: any): Promise<string[]> {
  switch (cfg.recipient) {
    case "user":
      return cfg.userId ? [cfg.userId] : [];
    case "workflow.owner":
      return ctx.ownerUserId ? [ctx.ownerUserId] : [];
    case "payload.userId": {
      const v = readPath(ctx.payload, "userId");
      return typeof v === "string" ? [v] : [];
    }
    case "company.owners":
    default:
      return companyOwnerIds(ctx.admin, ctx.companyId);
  }
}

// ----------------------------- actions --------------------------------
async function executeAction(
  ctx: RunContext,
  type: WorkflowActionType,
  rawConfig: unknown,
): Promise<{ ok: boolean; detail: string }> {
  const permission = ACTION_PERMISSION[type];
  if (!(await ownerMay(ctx, permission))) {
    return { ok: false, detail: `skipped: workflow owner lacks ${permission}` };
  }

  const cfg: any = parseActionConfig(type, rawConfig);
  const admin = ctx.admin;
  const p = ctx.payload;
  const branchId = (p.branchId as string | undefined) ?? null;

  switch (type) {
    case "create_task": {
      const due =
        cfg.dueInHours != null
          ? new Date(Date.now() + cfg.dueInHours * 3600_000).toISOString()
          : null;
      const { data, error } = await admin
        .from("tasks")
        .insert({
          company_id: ctx.companyId,
          branch_id: branchId,
          title: interpolate(cfg.title, p).slice(0, 200),
          description: cfg.description ? interpolate(cfg.description, p) : null,
          priority: cfg.priority,
          due_at: due,
          assignee_kind: cfg.assigneeKind,
          assigned_user_id: cfg.assignedUserId ?? null,
          assigned_role_id: cfg.assignedRoleId ?? null,
          assigned_department_id: cfg.assignedDepartmentId ?? null,
          related_module: cfg.relatedModule ?? null,
          related_entity_type: (p.entityType as string) ?? ctx.eventKey,
          related_entity_id: (p.entityId as string) ?? null,
          source: "workflow",
          created_by: ctx.ownerUserId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      ctx.lastTaskId = (data as any).id;
      return { ok: true, detail: `task ${(data as any).id}` };
    }

    case "send_notification": {
      const recipients = await resolveRecipients(ctx, cfg);
      for (const uid of recipients) {
        await admin.from("notifications").insert({
          company_id: ctx.companyId,
          recipient_user_id: uid,
          source_module_id: "workflow",
          category: cfg.category,
          priority: cfg.priority,
          title: interpolate(cfg.title, p),
          message: interpolate(cfg.message ?? "", p),
          deep_link: cfg.deepLink ? interpolate(cfg.deepLink, p) : null,
          entity_type: ctx.eventKey,
        });
      }
      return { ok: true, detail: `notified ${recipients.length}` };
    }

    case "queue_email": {
      const recipients = await resolveRecipients(ctx, cfg);
      for (const uid of recipients) {
        await admin.from("jobs").insert({
          company_id: ctx.companyId,
          module_id: "workflow",
          job_type: "email.send",
          payload: { templateKey: cfg.templateKey, userId: uid, templateData: p, category: cfg.category },
        });
      }
      return { ok: true, detail: `queued ${recipients.length} email(s)` };
    }

    case "create_approval": {
      const due =
        cfg.dueInHours != null
          ? new Date(Date.now() + cfg.dueInHours * 3600_000).toISOString()
          : null;
      const { data, error } = await admin
        .from("approval_requests")
        .insert({
          company_id: ctx.companyId,
          branch_id: branchId,
          subject: interpolate(cfg.subject, p).slice(0, 200),
          description: cfg.description ? interpolate(cfg.description, p) : null,
          module_id: "workflow",
          entity_type: (p.entityType as string) ?? ctx.eventKey,
          entity_id: (p.entityId as string) ?? null,
          required_permission: cfg.requiredPermission ?? null,
          status: "pending",
          total_steps: 1,
          current_step: 1,
          due_at: due,
          requested_by: ctx.ownerUserId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const approvalId = (data as any).id;
      await admin.from("approval_steps").insert({
        approval_request_id: approvalId,
        company_id: ctx.companyId,
        step_number: 1,
        name: "Approval",
        approver_kind: cfg.approverKind,
        approver_user_id: cfg.approverUserId ?? null,
        approver_role_id: cfg.approverRoleId ?? null,
        status: "pending",
      });
      ctx.lastApprovalId = approvalId;
      return { ok: true, detail: `approval ${approvalId}` };
    }

    case "create_alert": {
      const { error } = await admin.from("alerts").insert({
        company_id: ctx.companyId,
        branch_id: branchId,
        alert_key: cfg.alertKey,
        module_id: "workflow",
        severity: cfg.severity,
        status: "open",
        title: interpolate(cfg.title, p),
        message: interpolate(cfg.message ?? "", p),
        deep_link: cfg.deepLink ? interpolate(cfg.deepLink, p) : null,
        data: p,
      });
      if (error) throw new Error(error.message);
      return { ok: true, detail: "alert raised" };
    }

    case "assign_user":
    case "assign_team": {
      const taskId = cfg.taskId ?? ctx.lastTaskId;
      if (!taskId) return { ok: false, detail: "no task in context" };
      const patch =
        type === "assign_user"
          ? { assignee_kind: "user", assigned_user_id: cfg.userId, assigned_department_id: null }
          : {
              assignee_kind: "department",
              assigned_department_id: cfg.departmentId,
              assigned_user_id: null,
            };
      const { error } = await admin
        .from("tasks")
        .update(patch)
        .eq("id", taskId)
        .eq("company_id", ctx.companyId);
      if (error) throw new Error(error.message);
      await admin.from("task_assignments").insert({
        task_id: taskId,
        company_id: ctx.companyId,
        assignee_kind: type === "assign_user" ? "user" : "department",
        assigned_user_id: type === "assign_user" ? cfg.userId : null,
        assigned_department_id: type === "assign_team" ? cfg.departmentId : null,
        assigned_by: ctx.ownerUserId,
        note: "assigned by workflow",
      });
      return { ok: true, detail: `assigned task ${taskId}` };
    }

    case "publish_event": {
      const { error } = await admin.from("event_queue").insert({
        event_key: cfg.key,
        version: 1,
        company_id: ctx.companyId,
        payload: { ...p, ...cfg.payload },
        published_by: ctx.ownerUserId,
        status: "queued",
        next_run_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return { ok: true, detail: `published ${cfg.key}` };
    }

    case "create_reminder": {
      const { error } = await admin.from("reminders").insert({
        company_id: ctx.companyId,
        branch_id: branchId,
        title: interpolate(cfg.title, p),
        message: cfg.message ? interpolate(cfg.message, p) : null,
        remind_at: new Date(Date.now() + cfg.inHours * 3600_000).toISOString(),
        recipient_user_id: cfg.recipientUserId ?? ctx.ownerUserId,
        deep_link: cfg.deepLink ?? null,
        related_entity_type: ctx.eventKey,
        related_entity_id: (p.entityId as string) ?? null,
        created_by: ctx.ownerUserId,
      });
      if (error) throw new Error(error.message);
      return { ok: true, detail: "reminder scheduled" };
    }

    case "create_request": {
      const { data, error } = await admin
        .from("internal_requests")
        .insert({
          company_id: ctx.companyId,
          branch_id: branchId,
          request_type: cfg.requestType,
          title: interpolate(cfg.title, p).slice(0, 200),
          description: cfg.description ? interpolate(cfg.description, p) : null,
          status: "submitted",
          amount: cfg.amount ?? null,
          submitted_at: new Date().toISOString(),
          requested_by: ctx.ownerUserId,
          related_entity_type: ctx.eventKey,
          related_entity_id: (p.entityId as string) ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      ctx.lastRequestId = (data as any).id;
      return { ok: true, detail: `request ${(data as any).id}` };
    }

    case "update_record": {
      const id =
        cfg.id ??
        (cfg.table === "tasks"
          ? ctx.lastTaskId
          : cfg.table === "internal_requests"
            ? ctx.lastRequestId
            : ctx.lastApprovalId);
      if (!id) return { ok: false, detail: "no record in context" };
      const { error } = await admin
        .from(cfg.table)
        .update({ status: cfg.status })
        .eq("id", id)
        .eq("company_id", ctx.companyId);
      if (error) throw new Error(error.message);
      return { ok: true, detail: `${cfg.table} ${id} -> ${cfg.status}` };
    }

    default:
      return { ok: false, detail: `unsupported action ${type}` };
  }
}

// ------------------------- workflow execution -------------------------
export async function executeWorkflow(
  admin: Admin,
  workflow: any,
  event: EventContext,
  idempotencyKey: string | null,
): Promise<{ status: string; matched: boolean }> {
  const companyId = workflow.company_id as string;
  const payload = event.payload ?? {};

  const conditions = (workflow.conditions ?? []) as WorkflowCondition[];
  const matched = evaluateConditions(conditions, workflow.condition_logic ?? "all", payload);

  // Idempotency: one run per (workflow, event).
  const { data: run, error: runErr } = await admin
    .from("workflow_runs")
    .insert({
      workflow_id: workflow.id,
      company_id: companyId,
      event_key: event.event_key,
      event_queue_id: event.id ?? null,
      idempotency_key: idempotencyKey,
      status: matched ? "running" : "skipped",
      matched,
      payload,
    })
    .select("id")
    .single();
  if (runErr) {
    // Duplicate idempotency key => already handled.
    if ((runErr as any).code === "23505") return { status: "duplicate", matched };
    throw new Error(runErr.message);
  }
  if (!matched) return { status: "skipped", matched };

  const ctx: RunContext = {
    admin,
    companyId,
    ownerUserId: workflow.owner_user_id ?? workflow.created_by ?? null,
    payload,
    eventKey: event.event_key,
  };

  const { data: actions } = await admin
    .from("workflow_actions")
    .select("id, action_type, config, position, is_active")
    .eq("workflow_id", workflow.id)
    .eq("is_active", true)
    .order("position");

  const results: any[] = [];
  let status: "completed" | "failed" = "completed";
  let error: string | null = null;

  try {
    for (const a of (actions as any[]) ?? []) {
      const r = await executeAction(ctx, a.action_type as WorkflowActionType, a.config);
      results.push({ actionId: a.id, type: a.action_type, ...r });
    }
  } catch (e: any) {
    status = "failed";
    error = e?.message ?? String(e);
  }

  await admin
    .from("workflow_runs")
    .update({
      status,
      result: { actions: results },
      error,
      finished_at: new Date().toISOString(),
    })
    .eq("id", (run as any).id);

  await admin
    .from("workflows")
    .update({ run_count: (workflow.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
    .eq("id", workflow.id);

  if (status === "completed") {
    await admin.from("event_queue").insert({
      event_key: "workflow.completed",
      version: 1,
      company_id: companyId,
      payload: { companyId, workflowId: workflow.id, runId: (run as any).id },
      status: "queued",
      next_run_at: new Date().toISOString(),
    });
  }

  return { status, matched };
}

/**
 * Entry point used by the event dispatcher: run every active workflow
 * subscribed to this event key for the event's company.
 */
export async function runWorkflowsForEvent(admin: Admin, event: EventContext): Promise<number> {
  if (!event.company_id) return 0;
  const { data: workflows } = await admin
    .from("workflows")
    .select("id, company_id, conditions, condition_logic, owner_user_id, created_by, run_count")
    .eq("company_id", event.company_id)
    .eq("trigger_event", event.event_key)
    .eq("is_active", true)
    .is("deleted_at", null);

  let ran = 0;
  for (const wf of (workflows as any[]) ?? []) {
    try {
      await executeWorkflow(admin, wf, event, event.id ?? null);
      ran++;
    } catch (e) {
      console.error("[workflow] run failed", wf.id, e);
    }
  }

  // Automation rules share the same trigger surface but are user-configured
  // shortcuts (single rule row holding conditions + actions inline).
  await runAutomationRulesForEvent(admin, event);
  return ran;
}

export async function runAutomationRulesForEvent(admin: Admin, event: EventContext): Promise<number> {
  if (!event.company_id) return 0;
  const { data: rules } = await admin
    .from("automation_rules")
    .select("id, company_id, conditions, actions, created_by, run_count")
    .eq("company_id", event.company_id)
    .eq("trigger_kind", "event")
    .eq("trigger_event", event.event_key)
    .eq("is_active", true)
    .is("deleted_at", null);

  let ran = 0;
  for (const rule of (rules as any[]) ?? []) {
    const matched = evaluateConditions(
      (rule.conditions ?? []) as WorkflowCondition[],
      "all",
      event.payload ?? {},
    );
    const ctx: RunContext = {
      admin,
      companyId: rule.company_id,
      ownerUserId: rule.created_by ?? null,
      payload: event.payload ?? {},
      eventKey: event.event_key,
    };
    const results: any[] = [];
    let status: "completed" | "failed" | "skipped" = matched ? "completed" : "skipped";
    let error: string | null = null;
    if (matched) {
      try {
        for (const a of (rule.actions ?? []) as any[]) {
          const r = await executeAction(ctx, a.type as WorkflowActionType, a.config);
          results.push({ type: a.type, ...r });
        }
      } catch (e: any) {
        status = "failed";
        error = e?.message ?? String(e);
      }
    }
    await admin.from("automation_runs").insert({
      automation_rule_id: rule.id,
      company_id: rule.company_id,
      status,
      matched,
      payload: event.payload ?? {},
      result: { actions: results },
      error,
    });
    await admin
      .from("automation_rules")
      .update({ run_count: (rule.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
      .eq("id", rule.id);
    ran++;
  }
  return ran;
}

// --------------------- reminders & escalations ------------------------
/** Deliver due reminders as in-app notifications. Called by the job runner. */
export async function runDueReminders(admin: Admin): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: due } = await admin
    .from("reminders")
    .select("id, company_id, title, message, recipient_user_id, deep_link")
    .eq("status", "scheduled")
    .lte("remind_at", nowIso)
    .limit(100);

  let sent = 0;
  for (const r of (due as any[]) ?? []) {
    try {
      if (r.recipient_user_id) {
        await admin.from("notifications").insert({
          company_id: r.company_id,
          recipient_user_id: r.recipient_user_id,
          source_module_id: "workflow",
          category: "business",
          priority: "normal",
          title: r.title,
          message: r.message ?? "",
          deep_link: r.deep_link ?? "/app/tasks",
          entity_type: "reminder",
          entity_id: r.id,
        });
      }
      await admin
        .from("reminders")
        .update({ status: "sent", sent_at: nowIso })
        .eq("id", r.id);
      sent++;
    } catch (e) {
      await admin.from("reminders").update({ status: "failed" }).eq("id", r.id);
      console.error("[reminder] failed", r.id, e);
    }
  }
  return sent;
}

/**
 * Escalate approval requests that have been pending too long, using each
 * company's configured escalation ladder.
 */
export async function runEscalations(admin: Admin): Promise<number> {
  const { data: pending } = await admin
    .from("approval_requests")
    .select("id, company_id, subject, created_at, escalation_level, requested_by")
    .eq("status", "pending")
    .is("deleted_at", null)
    .limit(200);

  let escalated = 0;
  for (const req of (pending as any[]) ?? []) {
    const hours = (Date.now() - new Date(req.created_at).getTime()) / 3600_000;
    const { data: rules } = await admin
      .from("escalation_rules")
      .select("id, level, after_hours, notify_kind, notify_user_id, notify_role_id")
      .eq("company_id", req.company_id)
      .eq("target_kind", "approval")
      .eq("is_active", true)
      .order("level");
    const next = ((rules as any[]) ?? []).find(
      (r) => r.level > (req.escalation_level ?? 0) && hours >= r.after_hours,
    );
    if (!next) continue;

    let recipients: string[] = [];
    if (next.notify_kind === "user" && next.notify_user_id) recipients = [next.notify_user_id];
    else recipients = await companyOwnerIds(admin, req.company_id);

    for (const uid of recipients) {
      await admin.from("notifications").insert({
        company_id: req.company_id,
        recipient_user_id: uid,
        source_module_id: "workflow",
        category: "business",
        priority: next.level >= 3 ? "critical" : "high",
        title: `Approval still pending: ${req.subject}`,
        message: `This approval has been waiting for ${Math.floor(hours)} hours.`,
        deep_link: "/app/approvals",
        entity_type: "approval_request",
        entity_id: req.id,
      });
    }
    await admin
      .from("approval_requests")
      .update({ escalation_level: next.level, last_escalated_at: new Date().toISOString() })
      .eq("id", req.id);
    await admin.from("event_queue").insert({
      event_key: "workflow.escalated",
      version: 1,
      company_id: req.company_id,
      payload: { companyId: req.company_id, approvalRequestId: req.id, level: next.level },
      status: "queued",
      next_run_at: new Date().toISOString(),
    });
    escalated++;
  }
  return escalated;
}

/** Flag overdue tasks once, emitting `task.overdue`. */
export async function runOverdueTasks(admin: Admin): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: overdue } = await admin
    .from("tasks")
    .select("id, company_id, title, assigned_user_id, metadata")
    .in("status", ["todo", "in_progress", "waiting"])
    .lt("due_at", nowIso)
    .is("deleted_at", null)
    .limit(200);

  let flagged = 0;
  for (const t of (overdue as any[]) ?? []) {
    if ((t.metadata ?? {}).overdue_notified) continue;
    await admin.from("event_queue").insert({
      event_key: "task.overdue",
      version: 1,
      company_id: t.company_id,
      payload: {
        companyId: t.company_id,
        taskId: t.id,
        title: t.title,
        recipientUserId: t.assigned_user_id ?? undefined,
      },
      status: "queued",
      next_run_at: nowIso,
    });
    await admin
      .from("tasks")
      .update({ metadata: { ...(t.metadata ?? {}), overdue_notified: true } })
      .eq("id", t.id);
    flagged++;
  }
  return flagged;
}
