import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLowStockItems, listStockMovements } from "@/modules/inventory/api/inventory.functions";

export const Route = createFileRoute("/_authenticated/app/inventory/")({
  component: InventoryOverview,
});

function InventoryOverview() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnLow = useServerFn(getLowStockItems);
  const fnMoves = useServerFn(listStockMovements);
  const { data: low } = useQuery({
    queryKey: ["inv", "low", companyId], enabled: !!companyId,
    queryFn: () => fnLow({ data: { companyId: companyId! } }),
  });
  const { data: moves } = useQuery({
    queryKey: ["inv", "moves", companyId], enabled: !!companyId,
    queryFn: () => fnMoves({ data: { companyId: companyId!, limit: 10 } }),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Low stock alerts</h2>
        {low?.items.length === 0 && <p className="text-sm text-muted-foreground">Everything is above the minimum.</p>}
        <ul className="space-y-2 text-sm">
          {low?.items.map((r: any) => (
            <li key={r.id} className="flex justify-between">
              <span>{r.products?.name}</span>
              <span className="text-amber-600">{r.quantity} / min {r.minimum_stock_level}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Recent stock activity</h2>
        {moves?.items.length === 0 && <p className="text-sm text-muted-foreground">No movements yet.</p>}
        <ul className="space-y-2 text-sm">
          {moves?.items.map((m: any) => (
            <li key={m.id} className="flex justify-between">
              <span>{m.products?.name} — {m.movement_type}</span>
              <span className="text-muted-foreground">{Number(m.previous_quantity)} → {Number(m.new_quantity)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
