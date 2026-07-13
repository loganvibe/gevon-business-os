import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStockMovements } from "@/modules/inventory/server/inventory.functions";

export const Route = createFileRoute("/_authenticated/app/stock-history")({
  component: StockHistoryPage,
});

function StockHistoryPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fn = useServerFn(listStockMovements);
  const { data } = useQuery({
    queryKey: ["stock-history", companyId], enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId!, limit: 100 } }),
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Stock History</h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Product</th>
            <th className="text-left p-2">Type</th><th className="text-right p-2">Qty</th>
            <th className="text-right p-2">Before</th><th className="text-right p-2">After</th>
            <th className="text-left p-2">Notes</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((m: any) => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{new Date(m.created_at).toLocaleString()}</td>
                <td className="p-2">{m.products?.name}</td>
                <td className="p-2">{m.movement_type}</td>
                <td className="p-2 text-right">{Number(m.quantity)}</td>
                <td className="p-2 text-right">{Number(m.previous_quantity)}</td>
                <td className="p-2 text-right">{Number(m.new_quantity)}</td>
                <td className="p-2 text-muted-foreground">{m.notes ?? ""}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No movements yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
