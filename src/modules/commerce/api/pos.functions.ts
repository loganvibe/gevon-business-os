/**
 * POS registers and cashier sessions (Milestone 12).
 * Hardware-agnostic: a "register" is just a named till identified by an
 * optional device identifier.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { money } from "./shared";

export const listRegisters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("pos_registers")
      .select("*")
      .eq("company_id", data.companyId)
      .order("name");
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(80),
        deviceIdentifier: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("pos_registers")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        name: data.name,
        device_identifier: data.deviceIdentifier ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "commerce.register.created",
      entityType: "pos_registers",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const getOpenSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await (context.supabase as any)
      .from("pos_sessions")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("cashier_user_id", context.userId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row ?? null;
  });

export const openSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        registerId: z.string().uuid().nullable().optional(),
        openingBalance: z.number().nonnegative().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: existing } = await supabase
      .from("pos_sessions")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("cashier_user_id", context.userId)
      .eq("status", "open")
      .maybeSingle();
    if (existing) throw new Error("You already have an open session");

    const { data: row, error } = await supabase
      .from("pos_sessions")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        register_id: data.registerId ?? null,
        cashier_user_id: context.userId,
        opening_balance: data.openingBalance,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "commerce.pos_session.opened",
      entityType: "pos_sessions",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const closeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        countedCash: z.number().nonnegative(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: session, error: sErr } = await supabase
      .from("pos_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (sErr) throw new Error(sErr.message);
    if (session.status !== "open") throw new Error("Session is not open");

    const expected = money(Number(session.opening_balance ?? 0) + Number(session.sales_total ?? 0));
    const difference = money(data.countedCash - expected);

    const { data: row, error } = await supabase
      .from("pos_sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        counted_cash: data.countedCash,
        expected_cash: expected,
        closing_balance: data.countedCash,
        difference,
        notes: data.notes ?? null,
      })
      .eq("id", data.sessionId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: session.company_id,
      action: "commerce.pos_session.closed",
      entityType: "pos_sessions",
      entityId: row.id,
      before: session,
      after: row,
    });
    return row;
  });

export const listSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("pos_sessions")
      .select("*")
      .eq("company_id", data.companyId)
      .order("opened_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });
