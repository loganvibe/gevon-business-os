import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enterpriseSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const [
      { count: warehouseCount },
      { count: vendorCount },
      { count: assetCount },
      { count: maintenanceOpen },
      { count: vehicleCount },
      { count: poPending },
    ] = await Promise.all([
      supabase.from("warehouses").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("status", "active"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("status", "active"),
      supabase.from("assets").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("status", "active"),
      supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("status", "open"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("status", "active"),
      supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("status", "draft"),
    ]);

    const { data: pendingPR } = await supabase
      .from("purchase_requests")
      .select("id, request_number, total_estimated, created_at, branches(name)")
      .eq("company_id", data.companyId)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: maintenanceDue } = await supabase
      .from("maintenance_requests")
      .select("id, request_number, title, priority, assets(name), vehicles(registration_number)")
      .eq("company_id", data.companyId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      counts: {
        warehouses: warehouseCount ?? 0,
        vendors: vendorCount ?? 0,
        assets: assetCount ?? 0,
        maintenanceOpen: maintenanceOpen ?? 0,
        vehicles: vehicleCount ?? 0,
        purchaseOrdersPending: poPending ?? 0,
      },
      pendingPurchaseRequests: pendingPR ?? [],
      maintenanceDue: maintenanceDue ?? [],
    };
  });
