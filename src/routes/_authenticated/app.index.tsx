import { createFileRoute } from "@tanstack/react-router";
import { useActiveCompany } from "./app";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNavigation } from "@/platform/customer.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, Layers, Sparkles, ShieldCheck, Users, Building2, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const company = useActiveCompany();
  const fnNav = useServerFn(getNavigation);
  const nav = useQuery({ queryKey: ["nav", company.id], queryFn: () => fnNav({ data: { companyId: company.id } }) });

  const enabledModules = (nav.data?.groups ?? []).flatMap((g) => g.items.map((i) => ({ ...i, moduleName: g.moduleName })));
  const moduleCount = enabledModules.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        eyebrow={company.name}
        title="Welcome to Gevon BusinessOS"
        description="Your foundation is ready. Business modules will unlock here as they ship."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active company" value={company.name} icon={Building2} />
        <StatCard label="Base currency" value={company.currency} icon={Boxes} />
        <StatCard label="Timezone" value={company.timezone} icon={Layers} />
        <StatCard label="Enabled modules" value={`${moduleCount} active`} icon={LayoutDashboard} />
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold">Modules</h2>
      <p className="text-sm text-muted-foreground">Enable modules from Settings once available.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enabledModules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No modules enabled yet. Visit Settings to enable modules for your company.
            </CardContent>
          </Card>
        )}
        {enabledModules.map((m) => (
          <div key={m.to} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
                <m.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.moduleName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}
