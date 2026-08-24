/**
 * Commerce dashboard summary (Milestone 12).
 * Reads only from existing Sales/Orders tables plus the new commerce
 * fulfilment tables — no duplicate aggregation engine.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const commerceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), branchId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startOfDay = start.toISOString();
    const endOfDay = new Date(start.getTime() + 86400000).toISOString();

    let salesQ = supabase
      .from("sales")
      .select("total, channel")
      .eq("company_id", data.companyId)
      .eq("status", "completed")
      .gte("completed_at", startOfDay);
    if (data.branchId) salesQ = salesQ.eq("branch_id", data.branchId);
    const { data: todaySales } = await salesQ;

    const rows = todaySales ?? [];
    const todaysTotal = rows.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
    const onlineTotal = rows
      .filter((r: any) => r.channel !== "walk_in")
      .reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);

    const { count: openOrders } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .in("status", ["pending", "confirmed", "preparing", "ready", "out_for_delivery"]);

    const { count: onlineOrders } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .neq("channel", "walk_in")
      .gte("created_at", startOfDay);

    const { count: pendingDeliveries } = await supabase
      .from("delivery_orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .in("status", ["pending", "assigned", "picked_up", "in_transit"]);

    const { count: reservationsToday } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .gte("reserved_for", startOfDay)
      .lt("reserved_for", endOfDay);

    const { count: openSessions } = await supabase
      .from("pos_sessions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .eq("status", "open");

    const { count: publishedProducts } = await supabase
      .from("store_products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .eq("is_published", true);

    return {
      todaysSales: { count: rows.length, total: todaysTotal },
      onlineSalesTotal: onlineTotal,
      openOrders: openOrders ?? 0,
      onlineOrders: onlineOrders ?? 0,
      pendingDeliveries: pendingDeliveries ?? 0,
      reservationsToday: reservationsToday ?? 0,
      openPosSessions: openSessions ?? 0,
      publishedProducts: publishedProducts ?? 0,
    };
  });
