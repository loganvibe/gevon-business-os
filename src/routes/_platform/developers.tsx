import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import { Code2, AppWindow, BookOpen, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_platform/developers")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error("Unauthorized");
    const { data: admin } = await supabase.from("platform_admins").select("role, status").eq("user_id", userRes.user.id).eq("status", "active").maybeSingle();
    if (!admin || !["super_admin", "developer"].includes(admin.role)) throw new Error("Forbidden");
    return { role: admin.role };
  },
  component: DevelopersShell,
});

const NAV = [
  { to: "/developers", label: "Overview", icon: Code2, exact: true },
  { to: "/developers/apps", label: "Applications", icon: AppWindow },
  { to: "/developers/docs", label: "Documentation", icon: BookOpen },
  { to: "/developers/keys", label: "API Keys", icon: KeyRound },
];

function DevelopersShell() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-9 items-center justify-center gap-2 border-b border-destructive/40 bg-destructive/10 text-xs font-medium text-destructive">
        Developer Portal — internal use only.
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
          <div className="flex h-16 items-center border-b border-border px-5">
            <Link to="/developers" className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
                <span className="font-display text-xs font-bold">G</span>
              </div>
              <span className="font-display text-base font-semibold">Developer Portal</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
            {NAV.map((item) => {
              const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive ? "bg-foreground/10 font-medium text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}>
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
