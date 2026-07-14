import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPayments } from "@/modules/sales/server/payments.functions";

export const Route = createFileRoute("/_authenticated/app/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listPayments);
  const { data } = useQuery({
    queryKey: ["payments", companyId],
    queryFn: () => fnList({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Payments</h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Method</th>
            <th className="text-left p-2">Status</th>
            <th className="text-right p-2">Amount</th>
            <th className="text-left p-2">Reference</th>
            <th className="text-left p-2">Paid at</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.method}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2 text-right">{Number(p.amount).toLocaleString()} {p.currency_code}</td>
                <td className="p-2">{p.reference ?? "—"}</td>
                <td className="p-2">{new Date(p.paid_at).toLocaleString()}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
