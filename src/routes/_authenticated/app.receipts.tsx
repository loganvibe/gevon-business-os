import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReceipts } from "@/modules/commerce/api/receipts.functions";

export const Route = createFileRoute("/_authenticated/app/receipts")({
  component: ReceiptsPage,
  head: () => ({
    meta: [
      { title: "Receipts — Gevon BusinessOS" },
      { name: "description", content: "Digital and printable receipts for every completed sale." },
      { property: "og:title", content: "Receipts — Gevon BusinessOS" },
      { property: "og:description", content: "Every sale receipted, searchable and reprintable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReceiptsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fn = useServerFn(listReceipts);
  const { data } = useQuery({
    queryKey: ["receipts", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Receipts</h1>
      <div className="rounded-lg border bg-card divide-y">
        {(data?.items ?? []).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between p-3 text-sm">
            <span className="font-medium">{r.receipt_number}</span>
            <span className="text-muted-foreground">{new Date(r.issued_at).toLocaleString()}</span>
            <span>₦{Number(r.total).toLocaleString()}</span>
            <span className="text-muted-foreground">{r.payment_method ?? "—"}</span>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No receipts yet.</p>
        )}
      </div>
    </div>
  );
}
