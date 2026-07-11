import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building2, Users, Gem, Blocks, Flag, ScrollText, LineChart, LogOut, ShieldAlert, Code2, Radio, Cpu, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/admin")({
  component: AdminShell,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/companies", label: "Companies", icon: Building2 },
  { to: "/admin/users", label: "Platform Users", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Gem },
  { to: "/admin/modules", label: "Modules", icon: Blocks },
  { to: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
  { to: "/admin/events", label: "Event Registry", icon: Radio },
  { to: "/admin/jobs", label: "Jobs", icon: Cpu },
  { to: "/admin/communications", label: "Communications", icon: Send },
  { to: "/admin/audit", label: "Global Audit", icon: ScrollText },
  { to: "/admin/analytics", label: "Analytics", icon: LineChart },
  { to: "/developers", label: "Developer Portal", icon: Code2 },
];

function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Warning ribbon — never mistake this for the customer portal */}
      <div className="flex h-9 items-center justify-center gap-2 border-b border-destructive/40 bg-destructive/10 text-xs font-medium text-destructive">
        <ShieldAlert className="h-3.5 w-3.5" />
        Gevon Admin Portal — internal use only. All actions are audited.
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
          <div className="flex h-16 items-center border-b border-border px-5">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
                <span className="font-display text-xs font-bold">G</span>
              </div>
              <span className="font-display text-base font-semibold">Gevon Admin</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
            {NAV.map((item) => {
              const path = location.pathname;
              const isActive = item.exact ? path === item.to : path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-foreground/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3">
            <div className="mb-2 text-xs text-muted-foreground">Signed in as</div>
            <div className="mb-3 truncate text-sm">{email}</div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await supabase.auth.signOut();
                toast.success("Signed out");
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
