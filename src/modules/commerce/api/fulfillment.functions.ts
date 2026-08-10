/**
 * Fulfilment: deliveries and reservations (Milestone 12).
 * Both are optional foundations — businesses that don't deliver or take
 * bookings simply keep the feature flags off.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";
import { emitCommerceEvent } from "./shared";

const deliveryStatus = z.enum([
  "pending",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
]);

export const listDeliveries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        status: deliveryStatus.optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("delivery_orders")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        orderId: z.string().uuid().nullable().optional(),
        saleId: z.string().uuid().nullable().optional(),
        customerId: z.string().uuid().nullable().optional(),
        recipientName: z.string().max(120).optional(),
        recipientPhone: z.string().max(40).optional(),
        addressLine: z.string().trim().min(3).max(300),
        city: z.string().max(80).optional(),
        state: z.string().max(80).optional(),
        landmark: z.string().max(160).optional(),
        deliveryFee: z.number().nonnegative().default(0),
        estimatedAt: z.string().datetime().nullable().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("delivery_orders")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        order_id: data.orderId ?? null,
        sale_id: data.saleId ?? null,
        customer_id: data.customerId ?? null,
        recipient_name: data.recipientName ?? null,
        recipient_phone: data.recipientPhone ?? null,
        address_line: data.addressLine,
        city: data.city ?? null,
        state: data.state ?? null,
        landmark: data.landmark ?? null,
        delivery_fee: data.deliveryFee,
        estimated_at: data.estimatedAt ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: data.companyId,
      action: "commerce.delivery.created",
      entityType: "delivery_orders",
      entityId: row.id,
      after: row,
    });
    await emitCommerceEvent(context.supabase, context.userId, "commerce.delivery.created", data.companyId, {
      companyId: data.companyId,
      deliveryId: row.id,
      orderId: data.orderId ?? null,
    });
    return row;
  });

export const updateDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        deliveryId: z.string().uuid(),
        status: deliveryStatus,
        assignedTo: z.string().uuid().nullable().optional(),
        failureReason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: before, error: bErr } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("id", data.deliveryId)
      .single();
    if (bErr) throw new Error(bErr.message);

    const patch: Record<string, unknown> = { status: data.status };
    if (data.assignedTo !== undefined) patch.assigned_to = data.assignedTo;
    if (data.status === "picked_up") patch.picked_up_at = new Date().toISOString();
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    if (data.status === "failed") patch.failure_reason = data.failureReason ?? null;

    const { data: row, error } = await supabase
      .from("delivery_orders")
      .update(patch)
      .eq("id", data.deliveryId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: before.company_id,
      action: `commerce.delivery.${data.status}`,
      entityType: "delivery_orders",
      entityId: row.id,
      before,
      after: row,
    });
    if (data.status === "delivered") {
      await emitCommerceEvent(context.supabase, context.userId, "commerce.delivery.completed", before.company_id, {
        companyId: before.company_id,
        deliveryId: row.id,
      });
    }
    return row;
  });

// ------------------------------ Reservations ---------------------------

const reservationStatus = z.enum(["requested", "confirmed", "checked_in", "completed", "cancelled", "no_show"]);

export const listReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        status: reservationStatus.optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("reservations")
      .select("*")
      .eq("company_id", data.companyId)
      .order("reserved_for", { ascending: true })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string().uuid().nullable().optional(),
        customerId: z.string().uuid().nullable().optional(),
        contactName: z.string().max(120).optional(),
        contactPhone: z.string().max(40).optional(),
        reservedFor: z.string().datetime(),
        durationMinutes: z.number().int().min(15).max(1440).default(60),
        partySize: z.number().int().min(1).max(1000).default(1),
        resourceLabel: z.string().max(80).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("reservations")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        customer_id: data.customerId ?? null,
        contact_name: data.contactName ?? null,
        contact_phone: data.contactPhone ?? null,
        reserved_for: data.reservedFor,
        duration_minutes: data.durationMinutes,
        party_size: data.partySize,
        resource_label: data.resourceLabel ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: data.companyId,
      action: "commerce.reservation.created",
      entityType: "reservations",
      entityId: row.id,
      after: row,
    });
    await emitCommerceEvent(context.supabase, context.userId, "commerce.reservation.created", data.companyId, {
      companyId: data.companyId,
      reservationId: row.id,
      reservedFor: data.reservedFor,
      partySize: data.partySize,
    });
    return row;
  });

export const updateReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reservationId: z.string().uuid(),
        status: reservationStatus.optional(),
        reservedFor: z.string().datetime().optional(),
        partySize: z.number().int().min(1).max(1000).optional(),
        resourceLabel: z.string().max(80).nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: before, error: bErr } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", data.reservationId)
      .single();
    if (bErr) throw new Error(bErr.message);

    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.reservedFor !== undefined) patch.reserved_for = data.reservedFor;
    if (data.partySize !== undefined) patch.party_size = data.partySize;
    if (data.resourceLabel !== undefined) patch.resource_label = data.resourceLabel;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await supabase
      .from("reservations")
      .update(patch)
      .eq("id", data.reservationId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: before.company_id,
      action: "commerce.reservation.updated",
      entityType: "reservations",
      entityId: row.id,
      before,
      after: row,
    });
    if (data.status === "confirmed" || data.status === "cancelled") {
      await emitCommerceEvent(
        context.supabase,
        context.userId,
        `commerce.reservation.${data.status}`,
        before.company_id,
        { companyId: before.company_id, reservationId: row.id },
      );
    }
    return row;
  });
