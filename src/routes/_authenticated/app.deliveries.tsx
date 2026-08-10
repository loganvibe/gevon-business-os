import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listDeliveries, updateDeliveryStatus } from "@/modules/commerce/api/fulfillment.functions";

export const Route = createFileRoute("/_authenticated/app/deliveries")({
  component: DeliveriesPage,
  head: () => ({
    meta: [
      { title: "Deliveries — Gevon BusinessOS" },
      { name: "description", content: "Track orders from dispatch to the customer's door." },
      { property: "og:title", content: "Deliveries — Gevon BusinessOS" },
      { property: "og:description", content: "Assign riders and follow delivery status in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const NEXT: Record<string, string> = {
  pending: "assigned",
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

function DeliveriesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fn = useServerFn(listDeliveries);
  const fnStatus = useServerFn(updateDeliveryStatus);
  const { data } = useQuery({
    queryKey: ["deliveries", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Deliveries</h1>
      <div className="rounded-lg border bg-card divide-y">
        {(data?.items ?? []).map((d: any) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span className="font-medium">{d.recipient_name ?? "Customer"}</span>
            <span className="text-muted-foreground">{d.address_line}</span>
            <span className="rounded bg-muted px-2 py-0.5">{d.status}</span>
            {NEXT[d.status] && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await fnStatus({ data: { deliveryId: d.id, status: NEXT[d.status] as any } });
                  toast.success(`Marked ${NEXT[d.status]}`);
                  qc.invalidateQueries({ queryKey: ["deliveries", companyId] });
                }}
              >
                Mark {NEXT[d.status].replace("_", " ")}
              </Button>
            )}
          </div>
        ))}
        {(data?.items ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No deliveries yet.</p>}
      </div>
    </div>
  );
}
