/**
 * Job Runner — server-only, invoked by `/api/public/hooks/job-runner`.
 * Leases queued jobs, runs the matching handler, records job_runs,
 * retries with exponential backoff on failure.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_HANDLERS } from "./handlers/_index";

const MAX_LEASE = 25;
const BACKOFF_BASE_SECONDS = 30;

export async function runJobRunner(admin: SupabaseClient): Promise<{
  leased: number;
  completed: number;
  failed: number;
  dead: number;
}> {
  const nowIso = new Date().toISOString();
  const workerId = `runner-${Math.random().toString(36).slice(2, 10)}`;

  const { data: candidates } = await (admin as any)
    .from("jobs")
    .select("id")
    .eq("status", "queued")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_LEASE);
  const ids = (candidates ?? []).map((r: any) => r.id);
  if (ids.length === 0) return { leased: 0, completed: 0, failed: 0, dead: 0 };

  await (admin as any).from("jobs")
    .update({ status: "running", locked_at: nowIso, locked_by: workerId })
    .in("id", ids)
    .eq("status", "queued");

  const { data: leased } = await (admin as any)
    .from("jobs")
    .select("id, job_type, payload, attempts, max_attempts, company_id")
    .eq("locked_by", workerId)
    .in("id", ids);

  let completed = 0, failed = 0, dead = 0;
  for (const job of (leased as any[]) ?? []) {
    const attempt = (job.attempts ?? 0) + 1;
    const { data: runRow } = await (admin as any)
      .from("job_runs")
      .insert({ job_id: job.id, attempt, status: "running" })
      .select("id")
      .single();

    const handler = JOB_HANDLERS[job.job_type];
    try {
      if (!handler) throw new Error(`no handler for job type: ${job.job_type}`);
      const output = await handler(admin, job.payload ?? {}, job.id);
      await (admin as any).from("jobs")
        .update({
          status: "completed", attempts: attempt,
          locked_at: null, locked_by: null,
        })
        .eq("id", job.id);
      await (admin as any).from("job_runs")
        .update({ status: "completed", finished_at: new Date().toISOString(), output: output ?? null })
        .eq("id", runRow?.id);
      completed++;
    } catch (e: any) {
      const message = e?.message ?? String(e);
      if (attempt >= (job.max_attempts ?? 3)) {
        await (admin as any).from("jobs")
          .update({
            status: "failed", attempts: attempt, last_error: message,
            locked_at: null, locked_by: null,
          })
          .eq("id", job.id);
        dead++;
      } else {
        const backoff = BACKOFF_BASE_SECONDS * Math.pow(2, attempt - 1);
        await (admin as any).from("jobs")
          .update({
            status: "queued", attempts: attempt, last_error: message,
            scheduled_for: new Date(Date.now() + backoff * 1000).toISOString(),
            locked_at: null, locked_by: null,
          })
          .eq("id", job.id);
        failed++;
      }
      await (admin as any).from("job_runs")
        .update({ status: "failed", finished_at: new Date().toISOString(), error: message })
        .eq("id", runRow?.id);
    }
  }
  return { leased: ids.length, completed, failed, dead };
}
