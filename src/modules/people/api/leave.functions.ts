/** Leave management server functions. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LEAVE_TYPES = [
  "annual", "sick", "unpaid", "maternity", "paternity", "compassionate", "study", "other",
] as const;
const LEAVE_STATUS = ["draft", "pending", "approved", "rejected", "cancelled"] as const;

export const listLeaveRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        status: z.enum(LEAVE_STATUS).optional(),
        employeeId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(300).default(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type, status, start_date, end_date, days, reason, decision_notes, created_at",
      )
      .eq("company_id", data.companyId)
      .order("start_date", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        employeeId: z.string().uuid(),
        leaveType: z.enum(LEAVE_TYPES).default("annual"),
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("leave_requests")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        employee_id: data.employeeId,
        leave_type: data.leaveType,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select("id, days, start_date, end_date, leave_type")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "leave.requested",
      version: 1,
      payload: {
        companyId: data.companyId,
        employeeId: data.employeeId,
        leaveId: row!.id,
        leaveType: row!.leave_type,
        startDate: row!.start_date,
        endDate: row!.end_date,
        days: Number(row!.days ?? 0),
      },
      status: "queued",
      published_by: context.userId,
    });

    return row;
  });

export const decideLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        approve: z.boolean(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("leave_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decision_notes: data.notes ?? null,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .select("id, employee_id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: data.approve ? "leave.approved" : "leave.rejected",
      version: 1,
      payload: {
        companyId: data.companyId,
        employeeId: row!.employee_id,
        leaveId: row!.id,
        ...(data.approve ? {} : { reason: data.notes ?? null }),
      },
      status: "queued",
      published_by: context.userId,
    });

    return { ok: true };
  });

export const cancelLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
