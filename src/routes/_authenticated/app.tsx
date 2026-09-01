import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Settings, Users, Building2, ShieldCheck, ScrollText, Blocks, Gem,
  ChevronsUpDown, LogOut, Plus, Loader2, Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listMyCompanies, setDefaultCompany } from "@/lib/core.functions";
import { getNavigation } from "@/platform/customer.functions";
import { DynamicNav } from "@/components/core/DynamicNav";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavigationCtx, useNavigationGroups } from "@/lib/navigation-context";

type ActiveCompany = { id: string; name: string; currency: string; timezone: string };
const ActiveCompanyCtx = createContext<ActiveCompany | null>(null);
export function useActiveCompany(): ActiveCompany {
  const v = useContext(ActiveCompanyCtx);
  if (!v) throw new Error("useActiveCompany must be used inside AppShell");
  return v;
}

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fnList = useServerFn(listMyCompanies);
  const fnNav = useServerFn(getNavigation);
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

  const active = data?.companies.find((c) => c.id === activeId) ?? data?.companies[0];

  const { data: navData } = useQuery({
    queryKey: ["nav", active?.id],
    queryFn: () => fnNav({ data: { companyId: active!.id } }),
    enabled: !!active?.id,
    staleTime: 30_000,
  });

  if (isLoading || !data || !active) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (data.companies.length === 0) return null;

  return (
    <ActiveCompanyCtx value={{ id: active.id, name: active.name, currency: active.currency_code, timezone: active.timezone }}>
      <NavigationCtx value={navData?.groups ?? null}>
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
              <DynamicNav />
            </nav>
            <UserMenu />
          </aside>

          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </NavigationCtx>
    </ActiveCompanyCtx>
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
