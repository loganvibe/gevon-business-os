import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listVehicleInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["active", "maintenance", "inactive", "retired"]).optional(),
  branchId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listVehicles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listVehicleInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("vehicles")
      .select("id, name, registration_number, vehicle_type, manufacturer, model, year, color, status, mileage_km, fuel_type, assigned_to, insurance_expires_at, next_service_at, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,registration_number.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: vehicle, error } = await context.supabase
      .from("vehicles")
      .select("*, vehicle_assignments(*), fuel_records(*), fleet_trips(*), employees(first_name, last_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vehicle) throw new Error("Vehicle not found");
    return vehicle;
  });

const createVehicleInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  registrationNumber: z.string().trim().min(1).max(50),
  vehicleType: z.string().max(50).default("car"),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().max(50).optional(),
  branchId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  insuranceExpiresAt: z.string().optional(),
  registrationExpiresAt: z.string().optional(),
  lastServiceAt: z.string().optional(),
  nextServiceAt: z.string().optional(),
  mileageKm: z.number().nonnegative().default(0),
  fuelType: z.string().max(50).default("petrol"),
  tankCapacityL: z.number().positive().optional(),
});

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createVehicleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vehicles")
      .insert({
        company_id: data.companyId,
        branch_id: data.branchId ?? null,
        name: data.name,
        registration_number: data.registrationNumber,
        vehicle_type: data.vehicleType,
        manufacturer: data.manufacturer ?? null,
        model: data.model ?? null,
        year: data.year ?? null,
        color: data.color ?? null,
        status: "active",
        assigned_to: data.assignedTo ?? null,
        insurance_expires_at: data.insuranceExpiresAt ?? null,
        registration_expires_at: data.registrationExpiresAt ?? null,
        last_service_at: data.lastServiceAt ?? null,
        next_service_at: data.nextServiceAt ?? null,
        mileage_km: data.mileageKm,
        fuel_type: data.fuelType,
        tank_capacity_l: data.tankCapacityL ?? null,
        created_by: context.userId,
      })
      .select("id, name, registration_number")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateVehicleInput = createVehicleInput.partial().extend({ id: z.string().uuid(), companyId: z.string().uuid() });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateVehicleInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.registrationNumber !== undefined) patch["registration_number"] = data.registrationNumber;
    if (data.vehicleType !== undefined) patch["vehicle_type"] = data.vehicleType;
    if (data.manufacturer !== undefined) patch["manufacturer"] = data.manufacturer;
    if (data.model !== undefined) patch["model"] = data.model;
    if (data.year !== undefined) patch["year"] = data.year;
    if (data.color !== undefined) patch["color"] = data.color;
    if (data.branchId !== undefined) patch["branch_id"] = data.branchId;
    if (data.assignedTo !== undefined) patch["assigned_to"] = data.assignedTo;
    if (data.insuranceExpiresAt !== undefined) patch["insurance_expires_at"] = data.insuranceExpiresAt;
    if (data.registrationExpiresAt !== undefined) patch["registration_expires_at"] = data.registrationExpiresAt;
    if (data.lastServiceAt !== undefined) patch["last_service_at"] = data.lastServiceAt;
    if (data.nextServiceAt !== undefined) patch["next_service_at"] = data.nextServiceAt;
    if (data.mileageKm !== undefined) patch["mileage_km"] = data.mileageKm;
    if (data.fuelType !== undefined) patch["fuel_type"] = data.fuelType;
    if (data.tankCapacityL !== undefined) patch["tank_capacity_l"] = data.tankCapacityL;

    const { error } = await context.supabase
      .from("vehicles")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid(), employeeId: z.string().uuid(), purpose: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await supabase.from("vehicle_assignments").insert({
      company_id: data.companyId,
      vehicle_id: data.id,
      employee_id: data.employeeId,
      purpose: data.purpose ?? null,
    });
    await supabase.from("vehicles").update({ assigned_to: data.employeeId }).eq("id", data.id);
    await supabase.from("event_queue").insert({
      company_id: data.companyId,
      event_key: "vehicle.assigned",
      version: 1,
      payload: { companyId: data.companyId, vehicleId: data.id, employeeId: data.employeeId },
      status: "queued",
      published_by: context.userId,
    });
    return { ok: true };
  });

const createFuelRecordInput = z.object({
  companyId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  liters: z.number().positive(),
  unitCost: z.number().nonnegative().default(0),
  currencyCode: z.string().length(3).default("NGN"),
  odometerKm: z.number().nonnegative().optional(),
  fuelType: z.string().max(50).default("petrol"),
  stationName: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  recordedAt: z.string().optional(),
});

export const createFuelRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createFuelRecordInput.parse(d))
  .handler(async ({ data, context }) => {
    const totalCost = data.liters * data.unitCost;
    const { data: row, error } = await context.supabase
      .from("fuel_records")
      .insert({
        company_id: data.companyId,
        vehicle_id: data.vehicleId,
        branch_id: null,
        recorded_at: data.recordedAt ?? new Date().toISOString(),
        liters: data.liters,
        unit_cost: data.unitCost,
        total_cost: totalCost,
        currency_code: data.currencyCode,
        odometer_km: data.odometerKm ?? null,
        fuel_type: data.fuelType,
        station_name: data.stationName ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const createTripInput = z.object({
  companyId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid().optional(),
  startLocation: z.string().max(200).optional(),
  endLocation: z.string().max(200).optional(),
  startOdometerKm: z.number().nonnegative().optional(),
  endOdometerKm: z.number().nonnegative().optional(),
  purpose: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  startedAt: z.string().optional(),
});

export const createFleetTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createTripInput.parse(d))
  .handler(async ({ data, context }) => {
    const distanceKm = (data.startOdometerKm != null && data.endOdometerKm != null)
      ? Number(data.endOdometerKm) - Number(data.startOdometerKm)
      : null;
    const { data: row, error } = await context.supabase
      .from("fleet_trips")
      .insert({
        company_id: data.companyId,
        vehicle_id: data.vehicleId,
        driver_id: data.driverId ?? null,
        start_location: data.startLocation ?? null,
        end_location: data.endLocation ?? null,
        start_odometer_km: data.startOdometerKm ?? null,
        end_odometer_km: data.endOdometerKm ?? null,
        distance_km: distanceKm,
        started_at: data.startedAt ?? new Date().toISOString(),
        purpose: data.purpose ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const completeFleetTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid(), endOdometerKm: z.number().nonnegative() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: trip, error } = await context.supabase
      .from("fleet_trips")
      .select("start_odometer_km, vehicle_id")
      .eq("id", data.id)
      .eq("company_id", data.companyId)
      .is("ended_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!trip) throw new Error("Trip not found or already completed");

    const distanceKm = Number(data.endOdometerKm) - Number(trip.start_odometer_km ?? 0);
    const { error: updateError } = await context.supabase
      .from("fleet_trips")
      .update({ ended_at: new Date().toISOString(), end_odometer_km: data.endOdometerKm, distance_km: distanceKm })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, distanceKm };
  });
