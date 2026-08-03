import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["draft", "pending", "approved", "rejected", "paid"]).optional(),
  categoryId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("expenses")
      .select(
        "id, expense_number, title, amount, tax_amount, total, amount_paid, currency_code, expense_date, status, payment_status, payment_method, vendor_name, category_id, branch_id, created_at",
      )
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false })
      .limit(data.limit);

    if (data.status) q = q.eq("status", data.status);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.from) q = q.gte("expense_date", data.from);
    if (data.to) q = q.lte("expense_date", data.to);
    if (data.q) q = q.ilike("title", `%${data.q}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: expense, error } = await context.supabase
      .from("expenses")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!expense) throw new Error("Expense not found");

    const { data: payments } = await context.supabase
      .from("expense_payments")
      .select("id, method, amount, currency_code, reference, paid_at, notes")
      .eq("expense_id", data.id)
      .order("paid_at", { ascending: false });

    const { data: attachments } = await context.supabase
      .from("expense_attachments")
      .select("id, file_path, file_name, content_type, size_bytes, created_at")
      .eq("expense_id", data.id);

    return { expense, payments: payments ?? [], attachments: attachments ?? [] };
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  amount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  currencyCode: z.string().length(3).default("NGN"),
  expenseDate: z.string().optional(),
  paymentMethod: z.enum(["cash", "transfer", "card", "split", "other"]).optional(),
  vendorName: z.string().max(200).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  reference: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  isRecurring: z.boolean().default(false),
  recurrence: z.string().max(50).optional(),
  submit: z.boolean().default(false),
});

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: numberRow, error: numErr } = await supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "EXP",
    } as any);
    if (numErr) throw new Error(numErr.message);

    const status = data.submit ? "pending" : "draft";

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId,
        category_id: data.categoryId ?? null,
        expense_number: numberRow as any,
        title: data.title,
        description: data.description ?? null,
        amount: data.amount,
        tax_amount: data.taxAmount,
        currency_code: data.currencyCode,
        expense_date: data.expenseDate ?? new Date().toISOString().slice(0, 10),
        payment_method: data.paymentMethod ?? null,
        vendor_name: data.vendorName ?? null,
        supplier_id: data.supplierId ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        is_recurring: data.isRecurring,
        recurrence: data.recurrence ?? null,
        status,
        created_by: context.userId,
      })
      .select("id, expense_number, total")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "expense.created",
      version: 1,
      payload: {
        companyId: data.companyId,
        expenseId: expense!.id,
        expenseNumber: expense!.expense_number,
        total: Number(expense!.total ?? 0),
        createdBy: context.userId,
      },
      status: "queued",
      published_by: context.userId,
    });

    if (data.submit) {
      await supabase.from("event_queue").insert({
        company_id: data.companyId,
        event_key: "expense.submitted",
        version: 1,
        payload: {
          companyId: data.companyId,
          expenseId: expense!.id,
          total: Number(expense!.total ?? 0),
        },
        status: "queued",
        published_by: context.userId,
      });
    }

    return expense;
  });

const updateInput = createInput
  .partial()
  .extend({ id: z.string().uuid(), companyId: z.string().uuid() })
  .omit({ submit: true });

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch['title'] = data.title;
    if (data.description !== undefined) patch['description'] = data.description;
    if (data.amount !== undefined) patch['amount'] = data.amount;
    if (data.taxAmount !== undefined) patch['tax_amount'] = data.taxAmount;
    if (data.categoryId !== undefined) patch['category_id'] = data.categoryId;
    if (data.branchId !== undefined) patch['branch_id'] = data.branchId;
    if (data.expenseDate !== undefined) patch['expense_date'] = data.expenseDate;
    if (data.paymentMethod !== undefined) patch['payment_method'] = data.paymentMethod;
    if (data.vendorName !== undefined) patch['vendor_name'] = data.vendorName;
    if (data.supplierId !== undefined) patch['supplier_id'] = data.supplierId;
    if (data.reference !== undefined) patch['reference'] = data.reference;
    if (data.notes !== undefined) patch['notes'] = data.notes;
    if (data.isRecurring !== undefined) patch['is_recurring'] = data.isRecurring;
    if (data.recurrence !== undefined) patch['recurrence'] = data.recurrence;

    const { error } = await context.supabase
      .from("expenses")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "expense.updated",
      version: 1,
      payload: { companyId: data.companyId, expenseId: data.id },
      status: "queued",
      published_by: context.userId,
    });

    return { ok: true };
  });

export const submitExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("expenses")
      .update({ status: "pending" })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .eq("status", "draft")
      .select("id, total")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Only draft expenses can be submitted");

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "expense.submitted",
      version: 1,
      payload: { companyId: data.companyId, expenseId: data.id, total: Number(row.total ?? 0) },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });

export const approveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS + the `expense.update` policy guard the write; approval intent is
    // additionally recorded in the audit log by the table trigger.
    const { data: row, error } = await context.supabase
      .from("expenses")
      .update({ status: "approved", approved_by: context.userId, approved_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .in("status", ["draft", "pending"])
      .select("id, total")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Expense cannot be approved in its current state");

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "expense.approved",
      version: 1,
      payload: {
        companyId: data.companyId,
        expenseId: data.id,
        total: Number(row.total ?? 0),
        approvedBy: context.userId,
      },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });

export const rejectExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expenses")
      .update({ status: "rejected", rejected_reason: data.reason ?? null })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "expense.rejected",
      version: 1,
      payload: { companyId: data.companyId, expenseId: data.id, reason: data.reason ?? null },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    await context.supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "expense.deleted",
      version: 1,
      payload: { companyId: data.companyId, expenseId: data.id },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });
