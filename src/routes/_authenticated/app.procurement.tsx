import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPurchaseRequests, approvePurchaseRequest } from "@/modules/enterprise/api/procurement.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/procurement")({
  component: ProcurementPage,
});

function ProcurementPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listPurchaseRequests);
  const fnApprove = useServerFn(approvePurchaseRequest);
  const { data, refetch } = useQuery({
    queryKey: ["purchase-requests", companyId],
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
    enabled: !!companyId,
  });

  async function approve(id: string) {
    if (!companyId) return;
    try {
      await fnApprove({ data: { companyId, id } });
      toast.success("Purchase request approved");
      refetch();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Purchase Requests</h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Number</th>
            <th className="text-left p-2">Status</th>
            <th className="text-right p-2">Estimated</th>
            <th className="text-left p-2">Branch</th>
            <th className="text-left p-2">Actions</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((pr: any) => (
              <tr key={pr.id} className="border-t">
                <td className="p-2">{pr.request_number}</td>
                <td className="p-2">{pr.status}</td>
                <td className="p-2 text-right">{Number(pr.total_estimated).toLocaleString()}</td>
                <td className="p-2">{pr.branches?.name ?? "—"}</td>
                <td className="p-2">
                  {pr.status === "submitted" && (
                    <Button size="sm" onClick={() => approve(pr.id)}>Approve</Button>
                  )}
                </td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No purchase requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
