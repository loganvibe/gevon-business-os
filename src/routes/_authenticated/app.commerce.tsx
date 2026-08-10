import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Store, ScanBarcode, Receipt, Truck, CalendarClock, Globe } from "lucide-react";
import { commerceSummary } from "@/modules/commerce/api/summary.functions";

export const Route = createFileRoute("/_authenticated/app/commerce")({
  component: CommerceOverview,
  head: () => ({
    meta: [
      { title: "Commerce — Gevon BusinessOS" },
      { name: "description", content: "Sell in store, online, by QR or WhatsApp and keep everything in one system." },
      { property: "og:title", content: "Commerce — Gevon BusinessOS" },
      { property: "og:description", content: "Multi-channel commerce for African businesses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const LINKS = [
  { to: "/app/pos", label: "Point of sale", icon: ScanBarcode, desc: "Fast checkout for walk-in customers" },
  { to: "/app/orders", label: "Orders", icon: Store, desc: "Every channel in one queue" },
  { to: "/app/receipts", label: "Receipts", icon: Receipt, desc: "Digital and printable receipts" },
  { to: "/app/store", label: "Online store", icon: Globe, desc: "Publish your catalogue" },
  { to: "/app/deliveries", label: "Deliveries", icon: Truck, desc: "Track orders to the customer" },
  { to: "/app/reservations", label: "Reservations", icon: CalendarClock, desc: "Bookings and tables" },
];

function CommerceOverview() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fn = useServerFn(commerceSummary);
  const { data } = useQuery({
    queryKey: ["commerce", "summary", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const stats = [
    { label: "Today's sales", value: data ? `₦${Number(data.todaysSales.total).toLocaleString()}` : "—" },
    { label: "Open orders", value: data?.openOrders ?? "—" },
    { label: "Online orders today", value: data?.onlineOrders ?? "—" },
    { label: "Pending deliveries", value: data?.pendingDeliveries ?? "—" },
    { label: "Reservations today", value: data?.reservationsToday ?? "—" },
    { label: "Open POS sessions", value: data?.openPosSessions ?? "—" },
    { label: "Published products", value: data?.publishedProducts ?? "—" },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Commerce</h1>
          <p className="text-sm text-muted-foreground">
            Sell through any channel. Already have a POS? Keep it — Gevon organises the business around it.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{String(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="rounded-lg border bg-card p-4 transition hover:border-primary">
            <l.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium">{l.label}</p>
            <p className="text-sm text-muted-foreground">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
