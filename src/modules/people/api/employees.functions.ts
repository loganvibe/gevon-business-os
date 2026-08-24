/**
 * Employee & department server functions.
 * All calls are RLS-scoped to the caller's company via requireSupabaseAuth.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "casual", "volunteer"] as const;
const EMPLOYMENT_STATUS = ["active", "probation", "suspended", "on_leave", "terminated", "resigned"] as const;

// ------------------------------ Departments -----------------------------

export const listDepartments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("departments")
      .select("id, name, code, description, parent_id, manager_id, branch_id, is_active, created_at")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const departmentInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(30).optional(),
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
});

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => departmentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("departments")
      .insert({
        company_id: data.companyId,
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        parent_id: data.parentId ?? null,
        manager_id: data.managerId ?? null,
        branch_id: data.branchId ?? null,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    departmentInput.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.code !== undefined) patch["code"] = data.code;
    if (data.description !== undefined) patch["description"] = data.description;
    if (data.parentId !== undefined) patch["parent_id"] = data.parentId;
    if (data.managerId !== undefined) patch["manager_id"] = data.managerId;
    if (data.branchId !== undefined) patch["branch_id"] = data.branchId;
    const { error } = await context.supabase.from("departments").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("departments")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------- Employees ------------------------------

const listInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(EMPLOYMENT_STATUS).optional(),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("employees")
      .select(
        "id, employee_number, first_name, last_name, email, phone, job_title, employment_type, status, hired_at, base_salary, currency_code, department_id, branch_id, manager_id, user_id",
      )
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status) q = q.eq("status", data.status);
    if (data.departmentId) q = q.eq("department_id", data.departmentId);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.q) q = q.or(`first_name.ilike.%${data.q}%,last_name.ilike.%${data.q}%,employee_number.ilike.%${data.q}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: employee, error } = await context.supabase
      .from("employees")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!employee) throw new Error("Employee not found");

    const { data: documents } = await context.supabase
      .from("employee_documents")
      .select("id, document_type, file_name, file_path, issued_at, expires_at, created_at")
      .eq("employee_id", data.id)
      .order("created_at", { ascending: false });

    return { employee, documents: documents ?? [] };
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  positionId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  gender: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
  jobTitle: z.string().trim().max(120).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).default("full_time"),
  status: z.enum(EMPLOYMENT_STATUS).default("active"),
  hiredAt: z.string().optional(),
  baseSalary: z.number().nonnegative().default(0),
  payFrequency: z.string().max(30).default("monthly"),
  currencyCode: z.string().length(3).default("NGN"),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(40).optional(),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: numberRow, error: numErr } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "EMP",
    } as never);
    if (numErr) throw new Error(numErr.message);

    const emergency =
      data.emergencyContactName || data.emergencyContactPhone
        ? { name: data.emergencyContactName ?? null, phone: data.emergencyContactPhone ?? null }
        : null;

    const { data: employee, error } = await supabase
      .from("employees")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId,
        department_id: data.departmentId ?? null,
        position_id: data.positionId ?? null,
        manager_id: data.managerId ?? null,
        employee_number: numberRow as unknown as string,
        first_name: data.firstName,
        last_name: data.lastName,
        middle_name: data.middleName ?? null,
        email: data.email ? data.email : null,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        date_of_birth: data.dateOfBirth ?? null,
        job_title: data.jobTitle ?? null,
        employment_type: data.employmentType,
        status: data.status,
        hired_at: data.hiredAt ?? new Date().toISOString().slice(0, 10),
        base_salary: data.baseSalary,
        pay_frequency: data.payFrequency,
        currency_code: data.currencyCode,
        emergency_contact: emergency,
        created_by: context.userId,
      })
      .select("id, employee_number, first_name, last_name")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "employee.created",
      version: 1,
      payload: {
        companyId: data.companyId,
        employeeId: employee!.id,
        employeeNumber: employee!.employee_number,
        fullName: `${employee!.first_name} ${employee!.last_name}`,
        createdBy: context.userId,
      },
      status: "queued",
      published_by: context.userId,
    });

    return employee;
  });

const updateInput = createInput.partial().extend({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
});

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.firstName !== undefined) patch["first_name"] = data.firstName;
    if (data.lastName !== undefined) patch["last_name"] = data.lastName;
    if (data.middleName !== undefined) patch["middle_name"] = data.middleName;
    if (data.email !== undefined) patch["email"] = data.email || null;
    if (data.phone !== undefined) patch["phone"] = data.phone;
    if (data.gender !== undefined) patch["gender"] = data.gender;
    if (data.dateOfBirth !== undefined) patch["date_of_birth"] = data.dateOfBirth;
    if (data.jobTitle !== undefined) patch["job_title"] = data.jobTitle;
    if (data.employmentType !== undefined) patch["employment_type"] = data.employmentType;
    if (data.status !== undefined) patch["status"] = data.status;
    if (data.hiredAt !== undefined) patch["hired_at"] = data.hiredAt;
    if (data.baseSalary !== undefined) patch["base_salary"] = data.baseSalary;
    if (data.payFrequency !== undefined) patch["pay_frequency"] = data.payFrequency;
    if (data.departmentId !== undefined) patch["department_id"] = data.departmentId;
    if (data.positionId !== undefined) patch["position_id"] = data.positionId;
    if (data.managerId !== undefined) patch["manager_id"] = data.managerId;
    if (data.branchId !== undefined) patch["branch_id"] = data.branchId;

    const { error } = await context.supabase
      .from("employees")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "employee.updated",
      version: 1,
      payload: { companyId: data.companyId, employeeId: data.id },
      status: "queued",
      published_by: context.userId,
    });

    return { ok: true };
  });

export const terminateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        reason: z.string().max(500).optional(),
        terminatedAt: z.string().optional(),
        resigned: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employees")
      .update({
        status: data.resigned ? "resigned" : "terminated",
        terminated_at: data.terminatedAt ?? new Date().toISOString().slice(0, 10),
        termination_reason: data.reason ?? null,
      })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "employee.terminated",
      version: 1,
      payload: { companyId: data.companyId, employeeId: data.id, reason: data.reason ?? null },
      status: "queued",
      published_by: context.userId,
    });

    return { ok: true };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
