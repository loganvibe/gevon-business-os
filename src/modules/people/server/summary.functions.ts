/** Workforce summary used by the People header and dashboard widgets. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const peopleSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const today = new Date().toISOString().slice(0, 10);

    const [headcount, onLeave, presentToday, pendingLeave, openPositions] = await Promise.all([
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId)
        .is("deleted_at", null)
        .in("status", ["active", "probation"]),
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId)
        .is("deleted_at", null)
        .eq("status", "on_leave"),
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId)
        .eq("work_date", today)
        .in("status", ["present", "late", "half_day"]),
      supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId)
        .eq("status", "pending"),
      supabase
        .from("job_positions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId)
        .is("deleted_at", null)
        .eq("status", "open"),
    ]);

    return {
      headcount: headcount.count ?? 0,
      onLeave: onLeave.count ?? 0,
      presentToday: presentToday.count ?? 0,
      pendingLeave: pendingLeave.count ?? 0,
      openPositions: openPositions.count ?? 0,
    };
  });
