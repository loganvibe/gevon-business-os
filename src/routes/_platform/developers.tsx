import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Developer Portal skeleton (`/developers/*`).
 * Currently gated to super_admin + developer platform roles. Real
 * functionality (API keys, sandbox, module authoring, docs) ships in a
 * later milestone.
 */
export const Route = createFileRoute("/_platform/developers")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: admin } = await supabase
      .from("platform_admins")
      .select("role, status")
      .eq("user_id", userRes.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!admin || !["super_admin","developer"].includes(admin.role)) {
      throw redirect({ to: "/admin" });
    }
    return { role: admin.role as string };
  },
  component: () => <Outlet />,
});
