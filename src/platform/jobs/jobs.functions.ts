/**
 * Background jobs — enqueue/list/cancel server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";

export const enqueueJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    jobType: string;
    payload?: Record<string, unknown>;
    companyId?: string | null;
    moduleId?: string;
    scheduledFor?: string;
    maxAttempts?: number;
  }) =>
    z.object({
      jobType: z.string().min(1),
      payload: z.record(z.string(), z.unknown()).default({}),
      companyId: z.string().uuid().nullable().optional(),
      moduleId: z.string().default("core"),
      scheduledFor: z.string().datetime().optional(),
      maxAttempts: z.number().int().min(1).max(20).default(3),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("jobs")
      .insert({
        company_id: data.companyId ?? null,
        module_id: data.moduleId,
        job_type: data.jobType,
        payload: data.payload,
        scheduled_for: data.scheduledFor ?? new Date().toISOString(),
        max_attempts: data.maxAttempts,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId ?? null,
      action: "job.enqueue",
      entityType: "platform.jobs",
      entityId: row.id,
      after: { jobType: data.jobType },
    });
    return { id: row.id as string };
  });

export const listJobs = createServerFn({ method: "POST" })
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
      .from("jobs")
      .select("id, job_type, status, attempts, max_attempts, scheduled_for, created_at, last_error, company_id, module_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const cancelJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("jobs")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .in("status", ["queued", "running"]);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null,
      action: "job.cancel",
      entityType: "platform.jobs",
      entityId: data.id,
    });
    return { ok: true };
  });
