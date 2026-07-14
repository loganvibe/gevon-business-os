import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReturns, approveReturn } from "@/modules/sales/server/returns.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/returns")({
  component: ReturnsPage,
});

function ReturnsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fnList = useServerFn(listReturns);
  const fnApprove = useServerFn(approveReturn);
  const { data } = useQuery({
    queryKey: ["returns", companyId],
    queryFn: () => fnList({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  async function approve(id: string) {
    try { await fnApprove({ data: { id } }); toast.success("Return processed"); qc.invalidateQueries({ queryKey: ["returns"] }); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Returns</h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Number</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Status</th>
            <th className="text-right p-2">Total</th>
            <th className="text-left p-2">Created</th>
            <th className="text-right p-2">Actions</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono text-xs">{r.return_number}</td>
                <td className="p-2">{r.return_type}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-right">{Number(r.total).toLocaleString()}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  {r.status !== "completed" && <Button size="sm" variant="outline" onClick={() => approve(r.id)}>Process</Button>}
                </td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No returns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
