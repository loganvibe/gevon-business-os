import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Receipt, Tags, TrendingUp } from "lucide-react";
import { financeSummary } from "@/modules/expenses/server/summary.functions";

export const Route = createFileRoute("/_authenticated/app/expenses")({
  component: ExpensesLayout,
});

const TABS = [
  { to: "/app/expenses", label: "Expenses", icon: Receipt, exact: true },
  { to: "/app/expenses/categories", label: "Categories", icon: Tags },
  { to: "/app/finance", label: "Financial overview", icon: TrendingUp },
];

function ExpensesLayout() {
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fn = useServerFn(financeSummary);
  const { data: summary } = useQuery({
    queryKey: ["finance", "summary", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Finance</h1>
            <p className="text-sm text-muted-foreground">
              Track what goes out and how healthy the business is.
            </p>
          </div>
        </div>
        {summary && (
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-muted-foreground">Month expenses</div>
              <div className="text-xl font-semibold">{money(summary.totalExpenses)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Unpaid</div>
              <div className="text-xl font-semibold text-amber-600">
                {money(summary.unpaidExpenses)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Pending approval</div>
              <div className="text-xl font-semibold">{summary.pendingApproval}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Estimated profit</div>
              <div
                className={`text-xl font-semibold ${summary.estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}
              >
                {money(summary.estimatedProfit)}
              </div>
            </div>
          </div>
        )}
      </header>

      <nav className="flex gap-1 border-b">
        {TABS.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
