/**
 * Customer records — the base of the Customer Growth engine.
 * Every read/write runs through the caller's RLS-scoped client, so
 * `customer.view` / `customer.manage` and tenant isolation are enforced by
 * the database itself. Mutations emit platform events for workflows.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";

const CUSTOMER_COLUMNS =
  "id, name, phone, email, customer_type, status, city, state, country_code, branch_id, tags, total_spent, purchase_count, first_purchase_at, last_purchase_at, created_at";

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        search: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .order("last_purchase_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.search) {
      const term = `%${data.search}%`;
      query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(160),
        phone: z.string().trim().max(30).optional(),
        email: z.string().trim().email().max(255).optional(),
        customerType: z.enum(["individual", "business", "wholesale", "vip", "other"]).default("individual"),
        city: z.string().trim().max(80).optional(),
        state: z.string().trim().max(80).optional(),
        tags: z.array(z.string().trim().max(40)).max(20).default([]),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("customers")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        customer_type: data.customerType,
        city: data.city || null,
        state: data.state || null,
        tags: data.tags,
        notes: data.notes || null,
        created_by: context.userId,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "customer.created",
      entityType: "customers",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        name: z.string().trim().min(1).max(160).optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        email: z.string().trim().email().max(255).nullable().optional(),
        customerType: z.enum(["individual", "business", "wholesale", "vip", "other"]).optional(),
        status: z.enum(["active", "inactive", "blocked"]).optional(),
        city: z.string().trim().max(80).nullable().optional(),
        state: z.string().trim().max(80).nullable().optional(),
        tags: z.array(z.string().trim().max(40)).max(20).optional(),
        notes: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.customerType !== undefined ? { customer_type: data.customerType } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.state !== undefined ? { state: data.state } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    };

    const { error } = await context.supabase
      .from("customers")
      .update(patch)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "customer.updated",
      entityType: "customers",
      entityId: data.id,
      after: patch,
    });
    return { ok: true };
  });

/** Consent is per channel; marketing delivery honours `opted_out` strictly. */
export const setCustomerConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        customerId: z.string().uuid(),
        channel: z.enum(["email", "in_app", "sms", "whatsapp"]),
        status: z.enum(["unknown", "opted_in", "opted_out"]),
        source: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("customer_consents").upsert(
      {
        company_id: data.companyId,
        customer_id: data.customerId,
        channel: data.channel,
        status: data.status,
        source: data.source ?? "manual",
        consented_at: data.status === "opted_in" ? now : null,
        revoked_at: data.status === "opted_out" ? now : null,
      },
      { onConflict: "customer_id,channel" },
    );
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "customer.consent_changed",
      entityType: "customer_consents",
      entityId: data.customerId,
      after: { channel: data.channel, status: data.status },
    });
    return { ok: true };
  });

export const listCustomerConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), customerId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customer_consents")
      .select("id, channel, status, consented_at, revoked_at")
      .eq("company_id", data.companyId)
      .eq("customer_id", data.customerId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
