/**
 * Loyalty — configurable programs, accounts, points award/redeem.
 * Nothing about the earn model is hard-coded: points per amount, minimum
 * redemption, expiry and tiers all come from the program row.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { emitMarketingEvent, resolveTier } from "./shared";

export const listLoyaltyPrograms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("loyalty_programs")
      .select(
        "id, name, description, is_active, points_per_amount, amount_unit, point_value, min_redemption_points, points_expire_after_days, tiers, created_at",
      )
      .eq("company_id", data.companyId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertLoyaltyProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        companyId: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        description: z.string().max(400).optional(),
        pointsPerAmount: z.number().min(0).max(10000).default(1),
        amountUnit: z.number().min(1).max(1_000_000).default(1000),
        pointValue: z.number().min(0).max(10000).default(1),
        minRedemptionPoints: z.number().int().min(0).max(1_000_000).default(100),
        pointsExpireAfterDays: z.number().int().min(1).max(3650).nullable().optional(),
        tiers: z
          .array(z.object({ name: z.string().trim().min(1).max(40), min_points: z.number().int().min(0) }))
          .max(10)
          .default([]),
        isActive: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      company_id: data.companyId,
      name: data.name,
      description: data.description ?? null,
      points_per_amount: data.pointsPerAmount,
      amount_unit: data.amountUnit,
      point_value: data.pointValue,
      min_redemption_points: data.minRedemptionPoints,
      points_expire_after_days: data.pointsExpireAfterDays ?? null,
      tiers: data.tiers,
      is_active: data.isActive,
      created_by: context.userId,
    };
    const query = data.id
      ? context.supabase.from("loyalty_programs").update(row).eq("id", data.id).eq("company_id", data.companyId).select("id, name").single()
      : context.supabase.from("loyalty_programs").insert(row).select("id, name").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: data.id ? "loyalty.program_updated" : "loyalty.program_created",
      entityType: "loyalty_programs",
      entityId: saved.id,
      after: saved,
    });
    return saved;
  });

export const getLoyaltyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        customerId: z.string().uuid(),
        programId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("loyalty_accounts")
      .select("id, program_id, customer_id, points_balance, lifetime_points, redeemed_points, tier, enrolled_at, last_activity_at")
      .eq("company_id", data.companyId)
      .eq("customer_id", data.customerId);
    if (data.programId) query = query.eq("program_id", data.programId);
    const { data: rows, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const listLoyaltyAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("loyalty_accounts")
      .select("id, points_balance, lifetime_points, tier, last_activity_at, customers(id, name, phone)")
      .eq("company_id", data.companyId)
      .order("points_balance", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

async function ensureAccount(
  context: { supabase: any; userId: string },
  companyId: string,
  programId: string,
  customerId: string,
) {
  const { data: existing } = await context.supabase
    .from("loyalty_accounts")
    .select("id, points_balance, lifetime_points, redeemed_points, tier")
    .eq("company_id", companyId)
    .eq("program_id", programId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await context.supabase
    .from("loyalty_accounts")
    .insert({ company_id: companyId, program_id: programId, customer_id: customerId })
    .select("id, points_balance, lifetime_points, redeemed_points, tier")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export const awardPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        programId: z.string().uuid(),
        customerId: z.string().uuid(),
        /** Either explicit points, or an amount to convert using the program. */
        points: z.number().int().min(1).max(1_000_000).optional(),
        amount: z.number().min(0).max(1_000_000_000).optional(),
        saleId: z.string().uuid().optional(),
        reason: z.string().max(200).optional(),
      })
      .refine((v) => v.points !== undefined || v.amount !== undefined, {
        message: "Provide points or amount",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: program, error: pErr } = await context.supabase
      .from("loyalty_programs")
      .select("id, points_per_amount, amount_unit, points_expire_after_days, tiers, is_active")
      .eq("id", data.programId)
      .eq("company_id", data.companyId)
      .single();
    if (pErr) throw new Error(pErr.message);
    if (!program.is_active) throw new Error("Loyalty program is not active");

    const points =
      data.points ??
      Math.floor((Number(data.amount ?? 0) / Number(program.amount_unit || 1)) * Number(program.points_per_amount || 0));
    if (points <= 0) return { awarded: 0 };

    const account = await ensureAccount(context as any, data.companyId, data.programId, data.customerId);
    const balance = Number(account.points_balance) + points;
    const lifetime = Number(account.lifetime_points) + points;
    const tier = resolveTier(program.tiers, lifetime);
    const tierChanged = tier !== account.tier;

    const { error: txErr } = await context.supabase.from("loyalty_transactions").insert({
      company_id: data.companyId,
      account_id: account.id,
      customer_id: data.customerId,
      txn_type: "earn",
      points,
      balance_after: balance,
      reason: data.reason ?? "Points awarded",
      sale_id: data.saleId ?? null,
      expires_at: program.points_expire_after_days
        ? new Date(Date.now() + program.points_expire_after_days * 86_400_000).toISOString()
        : null,
      created_by: context.userId,
    });
    if (txErr) throw new Error(txErr.message);

    const { error: accErr } = await context.supabase
      .from("loyalty_accounts")
      .update({
        points_balance: balance,
        lifetime_points: lifetime,
        tier,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    if (accErr) throw new Error(accErr.message);

    await emitMarketingEvent(context.supabase, context.userId, "loyalty.points_awarded", data.companyId, {
      companyId: data.companyId,
      customerId: data.customerId,
      programId: data.programId,
      points,
      balance,
    });
    if (tierChanged && tier) {
      await emitMarketingEvent(context.supabase, context.userId, "loyalty.tier_reached", data.companyId, {
        companyId: data.companyId,
        customerId: data.customerId,
        programId: data.programId,
        tier,
      });
    }
    await writeAudit(context, {
      companyId: data.companyId,
      action: "loyalty.points_awarded",
      entityType: "loyalty_accounts",
      entityId: account.id,
      after: { points, balance, tier },
    });
    return { awarded: points, balance, tier };
  });

export const redeemPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        programId: z.string().uuid(),
        customerId: z.string().uuid(),
        points: z.number().int().min(1).max(1_000_000),
        saleId: z.string().uuid().optional(),
        reason: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: program, error: pErr } = await context.supabase
      .from("loyalty_programs")
      .select("id, min_redemption_points, point_value")
      .eq("id", data.programId)
      .eq("company_id", data.companyId)
      .single();
    if (pErr) throw new Error(pErr.message);
    if (data.points < Number(program.min_redemption_points)) {
      throw new Error(`Minimum redemption is ${program.min_redemption_points} points`);
    }

    const { data: account, error: aErr } = await context.supabase
      .from("loyalty_accounts")
      .select("id, points_balance, redeemed_points")
      .eq("company_id", data.companyId)
      .eq("program_id", data.programId)
      .eq("customer_id", data.customerId)
      .single();
    if (aErr) throw new Error(aErr.message);
    if (Number(account.points_balance) < data.points) throw new Error("Not enough points");

    const balance = Number(account.points_balance) - data.points;
    const { error: txErr } = await context.supabase.from("loyalty_transactions").insert({
      company_id: data.companyId,
      account_id: account.id,
      customer_id: data.customerId,
      txn_type: "redeem",
      points: -data.points,
      balance_after: balance,
      reason: data.reason ?? "Points redeemed",
      sale_id: data.saleId ?? null,
      created_by: context.userId,
    });
    if (txErr) throw new Error(txErr.message);

    const { error: accErr } = await context.supabase
      .from("loyalty_accounts")
      .update({
        points_balance: balance,
        redeemed_points: Number(account.redeemed_points) + data.points,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    if (accErr) throw new Error(accErr.message);

    await emitMarketingEvent(context.supabase, context.userId, "loyalty.points_redeemed", data.companyId, {
      companyId: data.companyId,
      customerId: data.customerId,
      programId: data.programId,
      points: data.points,
      balance,
    });
    await writeAudit(context, {
      companyId: data.companyId,
      action: "loyalty.points_redeemed",
      entityType: "loyalty_accounts",
      entityId: account.id,
      after: { points: data.points, balance },
    });
    return { balance, value: data.points * Number(program.point_value) };
  });

export const listLoyaltyTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), customerId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("loyalty_transactions")
      .select("id, txn_type, points, balance_after, reason, created_at, customer_id")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.customerId) query = query.eq("customer_id", data.customerId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
