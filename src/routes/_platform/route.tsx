import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gate for the Gevon Admin Portal (`/admin/*`) and Developer Portal
 * (`/developers/*`). Requires an authenticated user AND an active row
 * in `public.platform_admins`. Customer users are redirected to the
 * customer portal — they must never reach any child of this layout.
 */
export const Route = createFileRoute("/_platform")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: userRes, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userRes.user) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    const { data: admin } = await supabase
      .from("platform_admins")
      .select("id, role, status")
      .eq("user_id", userRes.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!admin) {
      throw redirect({ to: "/app" });
    }
    return {
      user: userRes.user,
      platformAdmin: { id: admin.id, role: admin.role as string },
    };
  },
  component: () => <Outlet />,
});
