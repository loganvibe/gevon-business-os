import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { enterpriseSummary } from "@/modules/enterprise/api/enterprise.functions";
import { Link } from "@tanstack/react-router";
import { Building2, Truck, Monitor, Wrench, Car, ShoppingCart, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/operations/")({
  component: OperationsOverview,
});

function OperationsOverview() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fn = useServerFn(enterpriseSummary);
  const { data } = useQuery({
    queryKey: ["enterprise", "summary", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Warehouses", value: data?.counts?.warehouses ?? 0, to: "/app/warehouses", icon: Building2 },
          { label: "Vendors", value: data?.counts?.vendors ?? 0, to: "/app/vendors", icon: Truck },
          { label: "Assets", value: data?.counts?.assets ?? 0, to: "/app/assets", icon: Monitor },
          { label: "Open maintenance", value: data?.counts?.maintenanceOpen ?? 0, to: "/app/maintenance", icon: Wrench },
          { label: "Vehicles", value: data?.counts?.vehicles ?? 0, to: "/app/fleet", icon: Car },
          { label: "Draft POs", value: data?.counts?.purchaseOrdersPending ?? 0, to: "/app/procurement", icon: ShoppingCart },
        ].map((stat) => (
          <Link key={stat.label} to={stat.to} className="border rounded-lg p-4 hover:bg-muted/50 transition">
            <div className="flex items-center gap-2 text-muted-foreground">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <div className="text-2xl font-semibold mt-1">{stat.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Pending purchase requests</h2>
          {(!data?.pendingPurchaseRequests || data.pendingPurchaseRequests.length === 0) && (
            <p className="text-sm text-muted-foreground">No pending purchase requests.</p>
          )}
          <ul className="space-y-2 text-sm">
            {data?.pendingPurchaseRequests?.map((pr: any) => (
              <li key={pr.id} className="flex justify-between">
                <span>{pr.request_number}</span>
                <span className="text-muted-foreground">{Number(pr.total_estimated).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Maintenance due
          </h2>
          {(!data?.maintenanceDue || data.maintenanceDue.length === 0) && (
            <p className="text-sm text-muted-foreground">No open maintenance requests.</p>
          )}
          <ul className="space-y-2 text-sm">
            {data?.maintenanceDue?.map((m: any) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.title}</span>
                <span className="text-amber-600">{m.priority}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
