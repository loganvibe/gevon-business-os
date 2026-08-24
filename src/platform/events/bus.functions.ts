/**
 * Event Bus — publish/list server functions.
 * Modules ONLY interact with the platform via these functions.
 * Actual fan-out to subscribers happens asynchronously in the dispatcher
 * (see src/platform/events/dispatcher.ts, invoked by the cron hook route).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/integrations/platform/admin-middleware";
import { getEvent } from "./registry";
import { writeAudit } from "@/platform/audit.helpers";

/**
 * publishEvent — the canonical entry point. Validates payload against the
 * registry, enqueues into event_queue with status='queued'. Returns event id.
 */
export const publishEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    key: string;
    version?: number;
    companyId?: string | null;
    payload: Record<string, unknown>;
  }) =>
    z.object({
      key: z.string().min(1),
      version: z.number().int().positive().optional(),
      companyId: z.string().uuid().nullable().optional(),
      payload: z.record(z.string(), z.unknown()),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const def = getEvent(data.key);
    if (!def) throw new Error(`Unknown event: ${data.key}`);
    const parsed = def.payloadSchema.safeParse(data.payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload for ${data.key}: ${parsed.error.message}`);
    }
    const version = data.version ?? def.version;

    // Insert via user's RLS session — but only service role can INSERT into
    // event_queue per policy. Use admin here after auth verified user.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("event_queue")
      .insert({
        event_key: def.key,
        version,
        company_id: data.companyId ?? null,
        payload: parsed.data,
        published_by: context.userId,
        status: "queued",
        next_run_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await (supabaseAdmin as any).from("event_log").insert({
      event_queue_id: row.id,
      level: "info",
      message: `published ${def.key} v${version}`,
      meta: { userId: context.userId, companyId: data.companyId ?? null },
    });

    await writeAudit(context, {
      companyId: data.companyId ?? null,
      action: "event.publish",
      entityType: "platform.event_queue",
      entityId: row.id,
      after: { event_key: def.key, version },
    });

    return { id: row.id as string };
  });

/**
 * listQueue — company-scoped queue view (respects RLS).
 */
export const listEventQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId?: string | null; status?: string; limit?: number }) =>
    z.object({
      companyId: z.string().uuid().nullable().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("event_queue")
      .select("id, event_key, version, status, attempts, next_run_at, last_error, created_at, company_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/**
 * platform admin: list all registered events (catalog view).
 */
export const listRegisteredEvents = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("platform_events")
      .select("*")
      .order("key");
    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });
