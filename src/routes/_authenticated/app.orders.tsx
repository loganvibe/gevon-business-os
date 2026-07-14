import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, updateOrderStatus } from "@/modules/sales/server/orders.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/orders")({
  component: OrdersPage,
});

const NEXT: Record<string, string> = {
  draft: "pending",
  pending: "confirmed",
  confirmed: "completed",
};

function OrdersPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fnList = useServerFn(listOrders);
  const fnStatus = useServerFn(updateOrderStatus);

  const { data } = useQuery({
    queryKey: ["orders", companyId],
    queryFn: () => fnList({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  async function advance(id: string, current: string) {
    const next = NEXT[current];
    if (!next) return;
    try {
      await fnStatus({ data: { id, status: next as any } });
      toast.success(`Order → ${next}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Orders</h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Number</th>
            <th className="text-left p-2">Channel</th>
            <th className="text-left p-2">Status</th>
            <th className="text-right p-2">Total</th>
            <th className="text-left p-2">Expected</th>
            <th className="text-right p-2">Actions</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((o: any) => (
              <tr key={o.id} className="border-t">
                <td className="p-2 font-mono text-xs">{o.order_number}</td>
                <td className="p-2">{o.channel}</td>
                <td className="p-2">{o.status}</td>
                <td className="p-2 text-right">{Number(o.total).toLocaleString()}</td>
                <td className="p-2">{o.expected_at ? new Date(o.expected_at).toLocaleDateString() : "—"}</td>
                <td className="p-2 text-right">
                  {NEXT[o.status] && <Button size="sm" variant="outline" onClick={() => advance(o.id, o.status)}>→ {NEXT[o.status]}</Button>}
                </td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
