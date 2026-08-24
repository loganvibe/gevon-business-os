import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["open", "scheduled", "in_progress", "completed", "cancelled"]).optional(),
  maintenanceType: z.enum(["preventive", "corrective", "emergency", "inspection"]).optional(),
  assetId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listMaintenanceRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("maintenance_requests")
      .select("id, request_number, title, maintenance_type, status, priority, scheduled_for, actual_cost, assets(name), vehicles(registration_number), employees(first_name, last_name), created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.maintenanceType) q = q.eq("maintenance_type", data.maintenanceType);
    if (data.assetId) q = q.eq("asset_id", data.assetId);
    if (data.vehicleId) q = q.eq("vehicle_id", data.vehicleId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getMaintenanceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("maintenance_requests")
      .select("*, maintenance_records(*), assets(name), vehicles(registration_number), employees(first_name, last_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Maintenance request not found");
    return row;
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  maintenanceType: z.enum(["preventive", "corrective", "emergency", "inspection"]).default("corrective"),
  priority: z.string().max(50).default("normal"),
  assetId: z.string().uuid().nullable().optional(),
  vehicleId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  scheduledFor: z.string().optional(),
  costEstimate: z.number().nonnegative().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

export const createMaintenanceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: numberRow } = await context.supabase.rpc("next_document_number", {
      _company_id: data.companyId,
      _prefix: "MNT",
    } as any);

    const { data: row, error } = await context.supabase
      .from("maintenance_requests")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        asset_id: data.assetId ?? null,
        vehicle_id: data.vehicleId ?? null,
        request_number: numberRow as any,
        title: data.title,
        description: data.description ?? null,
        maintenance_type: data.maintenanceType,
        status: "open",
        priority: data.priority,
        scheduled_for: data.scheduledFor ?? null,
        cost_estimate: data.costEstimate ?? null,
        assigned_to: data.assignedTo ?? null,
        created_by: context.userId,
      })
      .select("id, request_number")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateInput = createInput.partial().extend({ id: z.string().uuid(), companyId: z.string().uuid() });

export const updateMaintenanceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch["title"] = data.title;
    if (data.description !== undefined) patch["description"] = data.description;
    if (data.maintenanceType !== undefined) patch["maintenance_type"] = data.maintenanceType;
    if (data.priority !== undefined) patch["priority"] = data.priority;
    if (data.scheduledFor !== undefined) patch["scheduled_for"] = data.scheduledFor;
    if (data.costEstimate !== undefined) patch["cost_estimate"] = data.costEstimate;
    if (data.assignedTo !== undefined) patch["assigned_to"] = data.assignedTo;

    const { error } = await context.supabase
      .from("maintenance_requests")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeMaintenanceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid(), actualCost: z.number().nonnegative().default(0), notes: z.string().max(2000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: row, error } = await supabase
      .from("maintenance_requests")
      .update({ status: "completed", completed_at: new Date().toISOString(), actual_cost: data.actualCost })
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .in("status", ["open", "scheduled", "in_progress"])
      .select("id, asset_id, vehicle_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Request cannot be completed in its current state");

    await supabase.from("maintenance_records").insert({
      company_id: data.companyId,
      maintenance_request_id: row.id,
      asset_id: row.asset_id,
      vehicle_id: row.vehicle_id,
      performed_by: context.userId,
      notes: data.notes ?? null,
      cost: data.actualCost,
    });

    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "asset.maintenance_completed",
      version: 1,
      payload: { companyId: data.companyId, assetId: row.asset_id, maintenanceId: row.id },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });
