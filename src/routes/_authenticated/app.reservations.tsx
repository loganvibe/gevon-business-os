import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listReservations, createReservation, updateReservation } from "@/modules/commerce/api/fulfillment.functions";

export const Route = createFileRoute("/_authenticated/app/reservations")({
  component: ReservationsPage,
  head: () => ({
    meta: [
      { title: "Reservations — Gevon BusinessOS" },
      { name: "description", content: "Take bookings for tables, rooms and service appointments." },
      { property: "og:title", content: "Reservations — Gevon BusinessOS" },
      { property: "og:description", content: "Bookings for restaurants, hotels and service businesses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReservationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [party, setParty] = useState(2);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fn = useServerFn(listReservations);
  const fnCreate = useServerFn(createReservation);
  const fnUpdate = useServerFn(updateReservation);

  const { data } = useQuery({
    queryKey: ["reservations", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Reservations</h1>

      <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-4 items-end">
        <div>
          <Label htmlFor="rname">Guest</Label>
          <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rwhen">Date &amp; time</Label>
          <Input id="rwhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rparty">Party size</Label>
          <Input id="rparty" type="number" min={1} value={party} onChange={(e) => setParty(Number(e.target.value))} />
        </div>
        <Button
          disabled={!companyId || !when}
          onClick={async () => {
            try {
              await fnCreate({
                data: {
                  companyId: companyId!,
                  contactName: name || undefined,
                  reservedFor: new Date(when).toISOString(),
                  partySize: party,
                },
              });
              toast.success("Reservation created");
              setName(""); setWhen("");
              qc.invalidateQueries({ queryKey: ["reservations", companyId] });
            } catch (e: any) {
              toast.error(e.message ?? "Could not create reservation");
            }
          }}
        >
          Add reservation
        </Button>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {(data?.items ?? []).map((r: any) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span className="font-medium">{r.contact_name ?? "Guest"}</span>
            <span className="text-muted-foreground">{new Date(r.reserved_for).toLocaleString()}</span>
            <span>{r.party_size} guests</span>
            <span className="rounded bg-muted px-2 py-0.5">{r.status}</span>
            {r.status === "requested" && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await fnUpdate({ data: { reservationId: r.id, status: "confirmed" } });
                  qc.invalidateQueries({ queryKey: ["reservations", companyId] });
                }}
              >
                Confirm
              </Button>
            )}
          </div>
        ))}
        {(data?.items ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No reservations yet.</p>}
      </div>
    </div>
  );
}
