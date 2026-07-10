/**
 * Server-fn middleware that gates the Gevon Admin Portal.
 * A caller must be signed in AND appear in `public.platform_admins`
 * with status='active'. The active platform_role is returned in context.
 *
 * Completely isolated from customer-side `requireSupabaseAuth` /
 * company membership — a platform admin is NOT automatically a member of
 * any company, and a company member is NOT automatically a platform admin.
 */
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlatformRole =
  | "super_admin" | "support" | "developer" | "operations"
  | "finance" | "compliance" | "security" | "billing";

export const requirePlatformAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("platform_admins")
      .select("id, role, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Forbidden: platform administrator access required");
    return next({
      context: {
        platformAdminId: data.id as string,
        platformRole: data.role as PlatformRole,
      },
    });
  });

export function requirePlatformRole(role: PlatformRole | PlatformRole[]) {
  const allowed = Array.isArray(role) ? role : [role];
  return createMiddleware({ type: "function" })
    .middleware([requirePlatformAdmin])
    .server(async ({ next, context }) => {
      if (!allowed.includes(context.platformRole)) {
        throw new Error(`Forbidden: requires platform role ${allowed.join(" or ")}`);
      }
      return next();
    });
}
