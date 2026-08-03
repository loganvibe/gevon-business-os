import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { financeSummary } from "@/modules/expenses/server/summary.functions";

export const Route = createFileRoute("/_authenticated/app/finance")({
  component: FinanceOverview,
  head: () => ({
    meta: [
      { title: "Financial overview | Gevon BusinessOS" },
      {
        name: "description",
        content:
          "See money in, money out, and estimated profit for your business in one place.",
      },
      { property: "og:title", content: "Financial overview | Gevon BusinessOS" },
      {
        property: "og:description",
        content: "Income versus expenses and estimated profit for your business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "warning";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "positive"
      ? "text-primary"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-amber-600"
          : "text-foreground";
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <Icon className="h-4 w-4" />
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function FinanceOverview() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);

  const fn = useServerFn(financeSummary);
  const { data, isLoading } = useQuery({
    queryKey: ["finance", "summary", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const money = (n: number) =>
    Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  if (isLoading || !data) {
    return <div className="p-6 text-muted-foreground">Loading financial overview…</div>;
  }

  const maxCategory = Math.max(1, ...data.byCategory.map((c) => c.total));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Financial overview</h1>
        <p className="text-sm text-muted-foreground">
          {data.periodStart} → {data.periodEnd}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Money in" value={money(data.totalIncome)} tone="positive" icon={TrendingUp} hint={`Today: ${money(data.todaysIncome)}`} />
        <Stat label="Money out" value={money(data.totalExpenses)} tone="negative" icon={TrendingDown} hint={`Today: ${money(data.todaysExpenses)}`} />
        <Stat
          label="Estimated profit"
          value={money(data.estimatedProfit)}
          tone={data.estimatedProfit >= 0 ? "positive" : "negative"}
          icon={Wallet}
          hint={`Margin ${data.margin.toFixed(1)}%`}
        />
        <Stat
          label="Unpaid expenses"
          value={money(data.unpaidExpenses)}
          tone="warning"
          icon={AlertCircle}
          hint={`${data.pendingApproval} awaiting approval`}
        />
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium">Where the money goes</h2>
        {data.byCategory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No expenses in this period yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.byCategory.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium">{money(c.total)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(c.total / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
