import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Settings, Users, Building2, ShieldCheck, ScrollText, Blocks, Gem,
  ChevronsUpDown, LogOut, Plus, Loader2, Bell,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { listMyCompanies, setDefaultCompany } from "@/lib/core.functions";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const NAV: Array<{ to: string; label: string; icon: any; exact?: boolean }> = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/settings", label: "Company Settings", icon: Settings },
  { to: "/app/settings/users", label: "Team", icon: Users },
  { to: "/app/settings/branches", label: "Branches", icon: Building2 },
  { to: "/app/settings/roles", label: "Roles", icon: ShieldCheck },
  { to: "/app/settings/modules", label: "Modules", icon: Blocks },
  { to: "/app/settings/subscription", label: "Subscription", icon: Gem },
  { to: "/app/settings/audit", label: "Audit Log", icon: ScrollText },
];

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fnList = useServerFn(listMyCompanies);
  const { data, isLoading } = useQuery({ queryKey: ["companies", "mine"], queryFn: () => fnList({}) });
  const [activeId, setActiveId] = useState<string | null>(null);
  const fnSetDefault = useServerFn(setDefaultCompany);

  useEffect(() => {
    if (!data) return;
    if (data.companies.length === 0) {
      navigate({ to: "/app/onboarding", replace: true });
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem("gevon:activeCompanyId") : null;
    const valid = data.companies.find((c) => c.id === stored);
    setActiveId(valid?.id ?? data.defaultCompanyId ?? data.companies[0]!.id);
  }, [data, navigate]);

  useEffect(() => {
    if (activeId) localStorage.setItem("gevon:activeCompanyId", activeId);
  }, [activeId]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (data.companies.length === 0) return null; // navigating

  const active = data.companies.find((c) => c.id === activeId) ?? data.companies[0]!;

  return (
    <ActiveCompanyContext value={{ id: active.id, name: active.name, currency: active.currency_code, timezone: active.timezone }}>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div className="flex h-16 items-center border-b border-sidebar-border px-5">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground">
                <span className="font-display text-xs font-bold">G</span>
              </div>
              <span className="font-display text-base font-semibold">Gevon</span>
            </Link>
          </div>
          <div className="p-3">
            <CompanySwitcher
              companies={data.companies}
              activeId={active.id}
              onChange={async (id) => {
                setActiveId(id);
                await fnSetDefault({ data: { companyId: id } });
                queryClient.invalidateQueries();
              }}
            />
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
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <UserMenu />
        </aside>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </ActiveCompanyContext>
  );
}

function CompanySwitcher({
  companies, activeId, onChange,
}: {
  companies: Array<{ id: string; name: string; currency_code: string }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = companies.find((c) => c.id === activeId);
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span className="truncate">
            <span className="font-display font-medium">{active?.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{active?.currency_code}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Switch company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => onChange(c.id)}>
            <div className="flex flex-1 items-center justify-between">
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.currency_code}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/app/onboarding" })}>
          <Plus className="mr-2 h-4 w-4" /> Create a new company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start px-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
              {email.slice(0, 1).toUpperCase() || "G"}
            </div>
            <span className="ml-2 truncate text-sm">{email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
          <DropdownMenuLabel className="pt-0 text-xs font-normal text-muted-foreground">{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await queryClient.cancelQueries();
              queryClient.clear();
              await supabase.auth.signOut();
              toast.success("Signed out");
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================
// Active company context (client-only)
// ============================================================
import { createContext, useContext } from "react";
type ActiveCompany = { id: string; name: string; currency: string; timezone: string };
const Ctx = createContext<ActiveCompany | null>(null);
function ActiveCompanyContext({ value, children }: { value: ActiveCompany; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useActiveCompany(): ActiveCompany {
  const v = useContext(Ctx);
  if (!v) throw new Error("useActiveCompany must be used inside AppShell");
  return v;
}
