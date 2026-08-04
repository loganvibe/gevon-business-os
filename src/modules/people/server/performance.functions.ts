/** Performance review server functions. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REVIEW_STATUS = ["draft", "in_progress", "submitted", "completed", "cancelled"] as const;

export const listReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        employeeId: z.string().uuid().optional(),
        status: z.enum(REVIEW_STATUS).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("performance_reviews")
      .select(
        "id, employee_id, reviewer_id, title, period_start, period_end, status, overall_rating, manager_comments, employee_comments, completed_at",
      )
      .eq("company_id", data.companyId)
      .order("period_end", { ascending: false })
      .limit(200);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        employeeId: z.string().uuid(),
        reviewerId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(1).max(160),
        periodStart: z.string(),
        periodEnd: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("performance_reviews")
      .insert({
        company_id: data.companyId,
        employee_id: data.employeeId,
        reviewer_id: data.reviewerId ?? null,
        title: data.title,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        status: "in_progress",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        status: z.enum(REVIEW_STATUS).optional(),
        overallRating: z.number().min(0).max(5).nullable().optional(),
        managerComments: z.string().max(4000).optional(),
        employeeComments: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch["status"] = data.status;
    if (data.overallRating !== undefined) patch["overall_rating"] = data.overallRating;
    if (data.managerComments !== undefined) patch["manager_comments"] = data.managerComments;
    if (data.employeeComments !== undefined) patch["employee_comments"] = data.employeeComments;
    if (data.status === "completed") patch["completed_at"] = new Date().toISOString();

    const { data: row, error } = await context.supabase
      .from("performance_reviews")
      .update(patch)
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .select("id, employee_id, overall_rating")
      .single();
    if (error) throw new Error(error.message);

    if (data.status === "completed") {
      await context.supabase.from("event_queue").insert({
        company_id: data.companyId,
        event_key: "performance.review.completed",
        version: 1,
        payload: {
          companyId: data.companyId,
          reviewId: row!.id,
          employeeId: row!.employee_id,
          overallRating: row!.overall_rating === null ? null : Number(row!.overall_rating),
        },
        status: "queued",
        published_by: context.userId,
      });
    }

    return { ok: true };
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("performance_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
