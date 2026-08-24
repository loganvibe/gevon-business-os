import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Warehouse, ShoppingCart, Truck, Monitor, Wrench, Car } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/operations")({
  component: OperationsLayout,
});

const TABS = [
  { to: "/app/operations", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/branches", label: "Branches", icon: Building2 },
  { to: "/app/warehouses", label: "Warehouses", icon: Warehouse },
  { to: "/app/procurement", label: "Procurement", icon: ShoppingCart },
  { to: "/app/vendors", label: "Vendors", icon: Truck },
  { to: "/app/assets", label: "Assets", icon: Monitor },
  { to: "/app/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/app/fleet", label: "Fleet", icon: Car },
];

function OperationsLayout() {
  const location = useLocation();
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Building2 className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-semibold">Operations</h1>
          <p className="text-sm text-muted-foreground">Multi-branch operations, warehouses, procurement, vendors, assets, maintenance, and fleet.</p>
        </div>
      </header>
      <nav className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
