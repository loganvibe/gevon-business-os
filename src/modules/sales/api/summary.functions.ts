import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const salesSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      branchId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    let salesQ = supabase
      .from("sales")
      .select("total")
      .eq("company_id", data.companyId)
      .eq("status", "completed")
      .gte("completed_at", startOfDay);
    if (data.branchId) salesQ = salesQ.eq("branch_id", data.branchId);
    const { data: todaySales } = await salesQ;

    const todaysTotal = (todaySales ?? []).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
    const todaysCount = (todaySales ?? []).length;
    const averageSale = todaysCount ? todaysTotal / todaysCount : 0;

    const { count: ordersWaiting } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .in("status", ["pending", "confirmed"]);

    let payQ = supabase
      .from("payment_records")
      .select("amount")
      .eq("company_id", data.companyId)
      .gte("paid_at", startOfDay);
    const { data: pays } = await payQ;
    const paymentsReceived = (pays ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

    const { count: returnsToday } = await supabase
      .from("returns")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .gte("created_at", startOfDay);

    return {
      todaysSales: { count: todaysCount, total: todaysTotal },
      averageSale,
      ordersWaiting: ordersWaiting ?? 0,
      paymentsReceived,
      returnsToday: returnsToday ?? 0,
    };
  });
