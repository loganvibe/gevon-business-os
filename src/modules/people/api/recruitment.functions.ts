/** Recruitment foundation: job positions and candidates. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const POSITION_STATUS = ["draft", "open", "on_hold", "closed", "filled"] as const;
const CANDIDATE_STATUS = [
  "applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn",
] as const;

export const listPositions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("job_positions")
      .select(
        "id, title, code, department_id, branch_id, employment_type, openings, min_salary, max_salary, currency_code, status, opened_at, closed_at",
      )
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        departmentId: z.string().uuid().nullable().optional(),
        branchId: z.string().uuid().nullable().optional(),
        employmentType: z
          .enum(["full_time", "part_time", "contract", "intern", "casual", "volunteer"])
          .default("full_time"),
        openings: z.number().int().min(0).max(1000).default(1),
        minSalary: z.number().nonnegative().optional(),
        maxSalary: z.number().nonnegative().optional(),
        currencyCode: z.string().length(3).default("NGN"),
        description: z.string().max(4000).optional(),
        requirements: z.string().max(4000).optional(),
        status: z.enum(POSITION_STATUS).default("open"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("job_positions")
      .insert({
        company_id: data.companyId,
        title: data.title,
        department_id: data.departmentId ?? null,
        branch_id: data.branchId ?? null,
        employment_type: data.employmentType,
        openings: data.openings,
        min_salary: data.minSalary ?? null,
        max_salary: data.maxSalary ?? null,
        currency_code: data.currencyCode,
        description: data.description ?? null,
        requirements: data.requirements ?? null,
        status: data.status,
        opened_at: data.status === "open" ? new Date().toISOString().slice(0, 10) : null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setPositionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(POSITION_STATUS) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("job_positions")
      .update({
        status: data.status,
        ...(data.status === "closed" || data.status === "filled"
          ? { closed_at: new Date().toISOString().slice(0, 10) }
          : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        positionId: z.string().uuid().optional(),
        status: z.enum(CANDIDATE_STATUS).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("recruitment_candidates")
      .select(
        "id, full_name, email, phone, source, status, position_id, interview_at, rating, expected_salary, currency_code, created_at",
      )
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.positionId) q = q.eq("position_id", data.positionId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        positionId: z.string().uuid().nullable().optional(),
        fullName: z.string().trim().min(1).max(160),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional(),
        source: z.string().max(80).optional(),
        expectedSalary: z.number().nonnegative().optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("recruitment_candidates")
      .insert({
        company_id: data.companyId,
        position_id: data.positionId ?? null,
        full_name: data.fullName,
        email: data.email ? data.email : null,
        phone: data.phone ?? null,
        source: data.source ?? null,
        expected_salary: data.expectedSalary ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        status: z.enum(CANDIDATE_STATUS),
        interviewAt: z.string().optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("recruitment_candidates")
      .update({
        status: data.status,
        ...(data.interviewAt ? { interview_at: data.interviewAt } : {}),
        ...(data.notes !== undefined ? { interview_notes: data.notes } : {}),
      })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .select("id, position_id")
      .single();
    if (error) throw new Error(error.message);

    if (data.status === "hired") {
      await context.supabase.from("event_queue").insert({
        company_id: data.companyId,
        event_key: "candidate.hired",
        version: 1,
        payload: {
          companyId: data.companyId,
          candidateId: row!.id,
          positionId: row!.position_id,
        },
        status: "queued",
        published_by: context.userId,
      });
    }

    return { ok: true };
  });
