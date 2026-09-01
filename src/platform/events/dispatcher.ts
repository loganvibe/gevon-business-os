/**
 * Event Dispatcher — server-only, invoked by the cron hook route
 * `/api/public/hooks/event-dispatcher`. Leases queued events, fans out to
 * subscribers declared in the in-code registry, retries with exponential
 * backoff, and dead-letters after max_attempts.
 *
 * This is a pure orchestration function — it never runs in the browser.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvent, type EventSubscriber } from "./registry";
import { runWorkflowsForEvent } from "@/modules/workflow/engine/executor";

const MAX_LEASE = 50;
const BACKOFF_BASE_SECONDS = 30;

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = (vars as any)[k];
    return v == null ? "" : String(v);
  });
}

function buildPromptForCapability(capabilityKey: string, payload: Record<string, unknown>): string {
  const context = JSON.stringify(payload, null, 2);
  switch (capabilityKey) {
    case "sales.sales_forecast":
      return `You are a sales forecasting assistant. Analyze the following business data and provide a sales forecast.\n\nData:\n${context}\n\nProvide a structured forecast with confidence intervals and key assumptions.`;
    case "inventory.low_stock_analysis":
      return `You are an inventory analyst. Identify low-stock risks from the following data.\n\nData:\n${context}\n\nList at-risk items, impact assessment, and recommended actions.`;
    case "expenses.spend_analysis":
      return `You are an expense analyst. Analyze spending patterns from the following data.\n\nData:\n${context}\n\nIdentify major cost drivers, trends, and anomalies.`;
    case "workflow.workflow_suggestions":
      return `You are a workflow optimization consultant. Suggest workflow improvements based on the following data.\n\nData:\n${context}\n\nPropose optimized workflows with expected impact.`;
    case "core.summarize_audit":
      return `You are an audit summarization assistant. Summarize the following audit log entries.\n\nData:\n${context}\n\nProvide a concise summary with key findings and risk indicators.`;
    default:
      return `You are a business assistant for Gevon BusinessOS. Help with the following request.\n\nContext:\n${context}\n\nProvide a clear, actionable response.`;
  }
}

async function resolveRecipients(
  admin: SupabaseClient,
  spec: EventSubscriber & { recipient?: string },
  payload: Record<string, any>,
  companyId: string | null,
): Promise<{ userIds: string[]; emails: string[] }> {
  const userIds: string[] = [];
  const emails: string[] = [];
  const recipient = (spec as any).recipient as string | undefined;
  if (!recipient) return { userIds, emails };

  if (recipient === "payload.userId" && payload.userId) userIds.push(payload.userId);
  if (recipient === "payload.recipientUserId" && payload.recipientUserId) userIds.push(payload.recipientUserId);
  if (recipient === "payload.email" && payload.email) emails.push(payload.email);
  if (recipient === "company.owners" && companyId) {
    const { data } = await (admin as any)
      .from("member_roles")
      .select("member:company_members!inner(user_id, company_id, status), role:roles!inner(key)")
      .eq("role.key", "owner")
      .eq("member.company_id", companyId)
      .eq("member.status", "active");
    for (const row of (data as any[]) ?? []) {
      const uid = row.member?.user_id;
      if (uid) userIds.push(uid);
    }
  }
  return { userIds, emails };
}

/** Evaluate whether user has channel+category enabled. Default = enabled. */
async function isEnabled(
  admin: SupabaseClient,
  userId: string,
  companyId: string | null,
  channel: "email" | "in_app",
  category: string,
  priority: string,
): Promise<boolean> {
  // Security/critical bypass in-app suppression
  if (channel === "in_app" && (category === "security" || priority === "critical")) return true;
  const { data } = await (admin as any)
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("category", category)
    .or(`company_id.is.null${companyId ? `,company_id.eq.${companyId}` : ""}`)
    .maybeSingle();
  if (!data) return true; // default: enabled
  return data.enabled === true;
}

async function renderInApp(
  admin: SupabaseClient,
  templateKey: string | undefined,
  payload: Record<string, any>,
): Promise<{ title: string; message: string }> {
  if (!templateKey) return { title: "Notification", message: JSON.stringify(payload) };
  const { data } = await (admin as any)
    .from("notification_templates")
    .select("subject, body_template")
    .eq("key", templateKey)
    .eq("channel", "in_app")
    .maybeSingle();
  const title = data?.subject ? interpolate(data.subject, payload) : "Notification";
  const message = data?.body_template ? interpolate(data.body_template, payload) : "";
  return { title, message };
}

async function dispatchSubscriber(
  admin: SupabaseClient,
  spec: EventSubscriber,
  ev: {
    id: string;
    event_key: string;
    payload: Record<string, any>;
    company_id: string | null;
  },
): Promise<void> {
  const payload = ev.payload ?? {};
  if (spec.kind === "notification") {
    const { userIds } = await resolveRecipients(admin, spec, payload, ev.company_id);
    if (userIds.length === 0) return;
    const { title, message } = await renderInApp(admin, spec.templateKey, payload);
    const deepLink = spec.deepLink ? interpolate(spec.deepLink, payload) : null;
    for (const uid of userIds) {
      const enabled = await isEnabled(
        admin, uid, ev.company_id, "in_app", spec.category, spec.priority ?? "normal",
      );
      if (!enabled) {
        await (admin as any).from("communication_logs").insert({
          company_id: ev.company_id,
          channel: "in_app",
          recipient_user_id: uid,
          status: "suppressed",
          template_key: spec.templateKey ?? null,
          subject: title,
        });
        continue;
      }
      await (admin as any).from("notifications").insert({
        company_id: ev.company_id,
        recipient_user_id: uid,
        category: spec.category,
        priority: spec.priority ?? "normal",
        title,
        message,
        deep_link: deepLink,
        entity_type: ev.event_key,
      });
      await (admin as any).from("communication_logs").insert({
        company_id: ev.company_id,
        channel: "in_app",
        recipient_user_id: uid,
        status: "sent",
        template_key: spec.templateKey ?? null,
        subject: title,
        sent_at: new Date().toISOString(),
      });
    }
    return;
  }

  if (spec.kind === "email") {
    const { emails, userIds } = await resolveRecipients(admin, spec, payload, ev.company_id);
    // For user-based recipients, look up email
    const addresses = [...emails];
    if (userIds.length) {
      const { data } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
      const map = new Map<string, string>();
      for (const u of data?.users ?? []) if (u.id && u.email) map.set(u.id, u.email);
      for (const uid of userIds) {
        const e = map.get(uid);
        if (e) addresses.push(e);
      }
    }
    for (const to of addresses) {
      // Enqueue email.send job; the runner talks to Lovable Emails (or
      // records a stub) so the bus stays decoupled from the email provider.
      await (admin as any).from("jobs").insert({
        company_id: ev.company_id,
        module_id: "core",
        job_type: "email.send",
        payload: {
          templateKey: spec.templateKey,
          to,
          templateData: payload,
          category: spec.category,
        },
      });
      await (admin as any).from("communication_logs").insert({
        company_id: ev.company_id,
        channel: "email",
        recipient_address: to,
        status: "queued",
        template_key: spec.templateKey,
      });
    }
    return;
  }

  if (spec.kind === "job") {
    const scheduled = new Date(Date.now() + (spec.delaySeconds ?? 0) * 1000).toISOString();
    await (admin as any).from("jobs").insert({
      company_id: ev.company_id,
      module_id: "core",
      job_type: spec.jobType,
      payload,
      scheduled_for: scheduled,
    });
    return;
  }

  if (spec.kind === "ai") {
    await (admin as any).from("jobs").insert({
      company_id: ev.company_id,
      module_id: "core",
      job_type: "ai.execute",
      payload: {
        capabilityKey: spec.capabilityKey,
        companyId: ev.company_id,
        eventQueueId: ev.id,
        prompt: buildPromptForCapability(spec.capabilityKey, ev.payload),
        context: ev.payload,
      },
      scheduled_for: new Date().toISOString(),
      max_attempts: 3,
    });
    return;
  }
}

/**
 * Lease and dispatch up to `MAX_LEASE` queued events.
 */
export async function runDispatcher(admin: SupabaseClient): Promise<{
  leased: number;
  completed: number;
  failed: number;
  deadLettered: number;
}> {
  const nowIso = new Date().toISOString();
  const workerId = `dispatcher-${Math.random().toString(36).slice(2, 10)}`;

  // Lease: select then update. Simpler than a CTE; race is bounded by locked_by.
  const { data: candidates } = await (admin as any)
    .from("event_queue")
    .select("id")
    .eq("status", "queued")
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(MAX_LEASE);
  const ids = (candidates ?? []).map((r: any) => r.id);
  if (ids.length === 0) return { leased: 0, completed: 0, failed: 0, deadLettered: 0 };

  await (admin as any).from("event_queue")
    .update({ status: "running", locked_at: nowIso, locked_by: workerId })
    .in("id", ids)
    .eq("status", "queued");

  const { data: leased } = await (admin as any)
    .from("event_queue")
    .select("id, event_key, version, payload, company_id, attempts, max_attempts")
    .eq("locked_by", workerId)
    .in("id", ids);

  let completed = 0, failed = 0, deadLettered = 0;
  for (const ev of (leased as any[]) ?? []) {
    const def = getEvent(ev.event_key);
    try {
      if (!def) throw new Error(`event not in registry: ${ev.event_key}`);
      for (const sub of def.subscribers) {
        await dispatchSubscriber(admin, sub, ev);
      }
      // Milestone 10: let company-configured workflows / automation rules
      // react to this event. Failures here never break subscriber fan-out.
      try {
        await runWorkflowsForEvent(admin, ev);
      } catch (wfErr) {
        console.error("[workflow] engine error", wfErr);
      }
      await (admin as any).from("event_queue")
        .update({ status: "completed", locked_at: null, locked_by: null })
        .eq("id", ev.id);
      await (admin as any).from("event_log").insert({
        event_queue_id: ev.id, level: "info", message: "dispatched",
      });
      completed++;
    } catch (e: any) {
      const attempts = (ev.attempts ?? 0) + 1;
      const message = e?.message ?? String(e);
      if (attempts >= (ev.max_attempts ?? 5)) {
        await (admin as any).from("event_queue")
          .update({
            status: "dead", attempts, last_error: message,
            locked_at: null, locked_by: null,
          })
          .eq("id", ev.id);
        // Emit event.dead_letter
        await (admin as any).from("event_queue").insert({
          event_key: "event.dead_letter",
          version: 1,
          company_id: ev.company_id,
          payload: {
            originalEventKey: ev.event_key,
            originalEventId: ev.id,
            lastError: message,
          },
        });
        deadLettered++;
      } else {
        const backoff = BACKOFF_BASE_SECONDS * Math.pow(2, attempts - 1);
        await (admin as any).from("event_queue")
          .update({
            status: "queued", attempts, last_error: message,
            next_run_at: new Date(Date.now() + backoff * 1000).toISOString(),
            locked_at: null, locked_by: null,
          })
          .eq("id", ev.id);
        failed++;
      }
      await (admin as any).from("event_log").insert({
        event_queue_id: ev.id, level: "error", message,
      });
    }
  }

  return { leased: ids.length, completed, failed, deadLettered };
}
