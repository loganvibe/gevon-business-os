import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart, LayoutDashboard, ClipboardList, Undo2, Wallet } from "lucide-react";
import { salesSummary } from "@/modules/sales/server/summary.functions";

export const Route = createFileRoute("/_authenticated/app/sales")({
  component: SalesLayout,
});

const TABS = [
  { to: "/app/sales", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/orders", label: "Orders", icon: ClipboardList },
  { to: "/app/returns", label: "Returns", icon: Undo2 },
  { to: "/app/payments", label: "Payments", icon: Wallet },
];

function SalesLayout() {
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fn = useServerFn(salesSummary);
  const { data: summary } = useQuery({
    queryKey: ["sales", "summary", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Sales</h1>
            <p className="text-sm text-muted-foreground">Sales, orders, returns, and payments.</p>
          </div>
        </div>
        {summary && (
          <div className="flex gap-6 text-sm">
            <div><div className="text-muted-foreground">Today's sales</div><div className="text-xl font-semibold">{summary.todaysSales.total.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground">Orders waiting</div><div className="text-xl font-semibold">{summary.ordersWaiting}</div></div>
            <div><div className="text-muted-foreground">Payments</div><div className="text-xl font-semibold">{summary.paymentsReceived.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground">Returns</div><div className="text-xl font-semibold text-amber-600">{summary.returnsToday}</div></div>
          </div>
        )}
      </header>
      <nav className="flex gap-1 border-b">
        {TABS.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
