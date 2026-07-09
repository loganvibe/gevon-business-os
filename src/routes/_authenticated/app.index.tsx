import { createFileRoute } from "@tanstack/react-router";
import { useActiveCompany } from "./app";
import { Boxes, Layers, Sparkles, ShieldCheck, Users, Building2 } from "lucide-react";
import { PageHeader } from "@/components/core/PageHeader";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

const MODULES = [
  { name: "CRM", desc: "Customers, leads, pipeline", icon: Users, status: "Coming soon" },
  { name: "Inventory", desc: "Multi-warehouse stock", icon: Layers, status: "Coming soon" },
  { name: "Sales", desc: "Quotes, orders, invoices", icon: Boxes, status: "Coming soon" },
  { name: "HR", desc: "People, attendance, payroll", icon: Users, status: "Coming soon" },
  { name: "AI Copilot", desc: "Embedded assistance", icon: Sparkles, status: "Coming soon" },
  { name: "Compliance", desc: "Audits, policies", icon: ShieldCheck, status: "Coming soon" },
];

function Dashboard() {
  const company = useActiveCompany();
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
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold">Modules</h2>
      <p className="text-sm text-muted-foreground">Enable modules from Settings once available.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <div key={m.name} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
                <m.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </div>
            <p className="mt-4 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {m.status}
            </p>
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
