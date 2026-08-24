/**
 * Customer segments — create, update, list and evaluate.
 * Segment rules are declarative (see engine/segments.ts); evaluation runs
 * through the caller's RLS-scoped client so a company can only ever segment
 * its own customers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { SegmentRulesSchema } from "../engine/segments";
import { applySegmentFilters, emitMarketingEvent } from "./shared";

export const listSegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customer_segments")
      .select("id, name, description, kind, rules, is_active, member_count, last_evaluated_at, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        description: z.string().max(400).optional(),
        kind: z.enum(["dynamic", "static"]).default("dynamic"),
        rules: SegmentRulesSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("customer_segments")
      .insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
        kind: data.kind,
        rules: data.rules,
        created_by: context.userId,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "segment.created",
      entityType: "customer_segments",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const updateSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        companyId: z.string().uuid(),
        name: z.string().trim().min(1).max(80).optional(),
        description: z.string().max(400).nullable().optional(),
        rules: SegmentRulesSchema.optional(),
        isActive: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.rules !== undefined ? { rules: data.rules } : {}),
      ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
    };
    const { error } = await context.supabase
      .from("customer_segments")
      .update(patch)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "segment.updated",
      entityType: "customer_segments",
      entityId: data.id,
      after: patch,
    });
    return { ok: true };
  });

export const deleteSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customer_segments")
      .delete()
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "segment.deleted",
      entityType: "customer_segments",
      entityId: data.id,
    });
    return { ok: true };
  });

/**
 * Re-computes segment membership. Members that left emit
 * `customer.segment_left`, new members emit `customer.segment_entered`, so
 * the Workflow Engine can react without the marketing module knowing about
 * any specific automation.
 */
export const evaluateSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        segmentId: z.string().uuid(),
        persist: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: segment, error: segErr } = await context.supabase
      .from("customer_segments")
      .select("id, name, rules, kind")
      .eq("id", data.segmentId)
      .eq("company_id", data.companyId)
      .single();
    if (segErr) throw new Error(segErr.message);

    const rules = SegmentRulesSchema.parse(segment.rules ?? { logic: "all", conditions: [] });

    const base = context.supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .eq("status", "active")
      .limit(5000);
    const { data: matched, error } = await applySegmentFilters(base, rules);
    if (error) throw new Error(error.message);
    const matchedIds = new Set((matched ?? []).map((c) => c.id));

    if (!data.persist || segment.kind === "static") {
      return { matched: matchedIds.size, entered: 0, left: 0 };
    }

    const { data: existing, error: memErr } = await context.supabase
      .from("customer_segment_members")
      .select("id, customer_id")
      .eq("company_id", data.companyId)
      .eq("segment_id", data.segmentId);
    if (memErr) throw new Error(memErr.message);
    const existingIds = new Set((existing ?? []).map((m) => m.customer_id));

    const entered = [...matchedIds].filter((id) => !existingIds.has(id));
    const left = (existing ?? []).filter((m) => !matchedIds.has(m.customer_id));

    if (entered.length) {
      const { error: insErr } = await context.supabase.from("customer_segment_members").insert(
        entered.map((customerId) => ({
          company_id: data.companyId,
          segment_id: data.segmentId,
          customer_id: customerId,
        })),
      );
      if (insErr) throw new Error(insErr.message);
    }
    if (left.length) {
      const { error: delErr } = await context.supabase
        .from("customer_segment_members")
        .delete()
        .in(
          "id",
          left.map((m) => m.id),
        );
      if (delErr) throw new Error(delErr.message);
    }

    await context.supabase
      .from("customer_segments")
      .update({ member_count: matchedIds.size, last_evaluated_at: new Date().toISOString() })
      .eq("id", data.segmentId)
      .eq("company_id", data.companyId);

    // Cap the fan-out so a first evaluation of a large book does not flood
    // the event bus; membership counts stay authoritative regardless.
    for (const customerId of entered.slice(0, 200)) {
      await emitMarketingEvent(context.supabase, context.userId, "customer.segment_entered", data.companyId, {
        companyId: data.companyId,
        segmentId: data.segmentId,
        segmentName: segment.name,
        customerId,
      });
    }
    for (const m of left.slice(0, 200)) {
      await emitMarketingEvent(context.supabase, context.userId, "customer.segment_left", data.companyId, {
        companyId: data.companyId,
        segmentId: data.segmentId,
        segmentName: segment.name,
        customerId: m.customer_id,
      });
    }

    return { matched: matchedIds.size, entered: entered.length, left: left.length };
  });

/** Preview: how many customers a rule set matches, without persisting. */
export const previewSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), rules: SegmentRulesSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const base = context.supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .is("deleted_at", null)
      .eq("status", "active");
    const { count, error } = await applySegmentFilters(base, data.rules);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const listSegmentMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), segmentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customer_segment_members")
      .select("customer_id, entered_at, customers(id, name, phone, email, total_spent, last_purchase_at)")
      .eq("company_id", data.companyId)
      .eq("segment_id", data.segmentId)
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
