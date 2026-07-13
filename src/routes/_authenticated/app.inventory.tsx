import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Package, Boxes, Truck, History, LayoutDashboard } from "lucide-react";
import { inventorySummary } from "@/modules/inventory/server/inventory.functions";

export const Route = createFileRoute("/_authenticated/app/inventory")({
  component: InventoryLayout,
});

const TABS = [
  { to: "/app/inventory", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/products", label: "Products", icon: Boxes },
  { to: "/app/suppliers", label: "Suppliers", icon: Truck },
  { to: "/app/stock-history", label: "Stock History", icon: History },
];

function InventoryLayout() {
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    setCompanyId(localStorage.getItem("gevon:activeCompanyId"));
  }, []);
  const fn = useServerFn(inventorySummary);
  const { data: summary } = useQuery({
    queryKey: ["inventory", "summary", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm text-muted-foreground">Products, stock, suppliers, and purchases.</p>
          </div>
        </div>
        {summary && (
          <div className="flex gap-6 text-sm">
            <div><div className="text-muted-foreground">Products</div><div className="text-xl font-semibold">{summary.totalProducts}</div></div>
            <div><div className="text-muted-foreground">Stock value</div><div className="text-xl font-semibold">{summary.stockValue.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground">Low stock</div><div className="text-xl font-semibold text-amber-600">{summary.lowStockCount}</div></div>
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
