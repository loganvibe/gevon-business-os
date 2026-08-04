/** Attendance and shift-schedule server functions. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ATTENDANCE_STATUS = ["present", "absent", "late", "half_day", "on_leave", "holiday"] as const;
const SHIFT_TYPES = ["morning", "afternoon", "night", "custom"] as const;

export const listAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        employeeId: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("attendance_records")
      .select(
        "id, employee_id, work_date, clock_in, clock_out, worked_minutes, break_minutes, status, source, notes, branch_id",
      )
      .eq("company_id", data.companyId)
      .order("work_date", { ascending: false })
      .limit(data.limit);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    if (data.from) q = q.gte("work_date", data.from);
    if (data.to) q = q.lte("work_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid(),
        employeeId: z.string().uuid(),
        workDate: z.string().optional(),
        clockIn: z.string().optional(),
        clockOut: z.string().optional(),
        breakMinutes: z.number().int().min(0).max(1440).default(0),
        status: z.enum(ATTENDANCE_STATUS).default("present"),
        notes: z.string().max(1000).optional(),
        source: z.enum(["clock", "manual", "import", "correction"]).default("manual"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const workDate = data.workDate ?? new Date().toISOString().slice(0, 10);
    const worked =
      data.clockIn && data.clockOut
        ? Math.max(
            Math.round(
              (new Date(data.clockOut).getTime() - new Date(data.clockIn).getTime()) / 60000,
            ) - data.breakMinutes,
            0,
          )
        : 0;

    const { data: row, error } = await context.supabase
      .from("attendance_records")
      .upsert(
        {
          company_id: data.companyId,
          branch_id: data.branchId,
          employee_id: data.employeeId,
          work_date: workDate,
          clock_in: data.clockIn ?? null,
          clock_out: data.clockOut ?? null,
          worked_minutes: worked,
          break_minutes: data.breakMinutes,
          status: data.status,
          source: data.source,
          notes: data.notes ?? null,
          created_by: context.userId,
        },
        { onConflict: "employee_id,work_date" },
      )
      .select("id, work_date, status")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "attendance.recorded",
      version: 1,
      payload: {
        companyId: data.companyId,
        employeeId: data.employeeId,
        attendanceId: row!.id,
        workDate: row!.work_date,
        status: row!.status,
      },
      status: "queued",
      published_by: context.userId,
    });

    return row;
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("attendance_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------------- Shifts --------------------------------

export const listShifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
        employeeId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("shift_schedules")
      .select(
        "id, employee_id, department_id, branch_id, shift_type, name, shift_date, starts_at, ends_at, is_published, notes",
      )
      .eq("company_id", data.companyId)
      .order("shift_date")
      .limit(500);
    if (data.from) q = q.gte("shift_date", data.from);
    if (data.to) q = q.lte("shift_date", data.to);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid(),
        employeeId: z.string().uuid().nullable().optional(),
        departmentId: z.string().uuid().nullable().optional(),
        shiftType: z.enum(SHIFT_TYPES).default("morning"),
        name: z.string().max(120).optional(),
        shiftDate: z.string(),
        startsAt: z.string(),
        endsAt: z.string(),
        notes: z.string().max(1000).optional(),
        isPublished: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("shift_schedules")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId,
        employee_id: data.employeeId ?? null,
        department_id: data.departmentId ?? null,
        shift_type: data.shiftType,
        name: data.name ?? null,
        shift_date: data.shiftDate,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        notes: data.notes ?? null,
        is_published: data.isPublished,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shift_schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
