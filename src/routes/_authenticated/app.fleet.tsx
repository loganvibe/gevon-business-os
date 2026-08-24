import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehicles, createVehicle } from "@/modules/enterprise/api/fleet.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/fleet")({
  component: FleetPage,
});

function FleetPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listVehicles);
  const fnCreate = useServerFn(createVehicle);
  const { data } = useQuery({
    queryKey: ["vehicles", companyId],
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
    enabled: !!companyId,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", registrationNumber: "", vehicleType: "car", manufacturer: "", model: "" });

  async function submit() {
    if (!companyId || !form.name.trim() || !form.registrationNumber.trim()) return;
    try {
      await fnCreate({ data: { companyId, name: form.name, registrationNumber: form.registrationNumber, vehicleType: form.vehicleType, manufacturer: form.manufacturer || undefined, model: form.model || undefined } });
      toast.success("Vehicle created");
      setOpen(false);
      setForm({ name: "", registrationNumber: "", vehicleType: "car", manufacturer: "", model: "" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fleet</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New vehicle</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New vehicle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Registration number</Label><Input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></div>
              <div><Label>Type</Label><Input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} /></div>
              <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Reg. number</th>
            <th className="text-left p-2">Type</th><th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((v: any) => (
              <tr key={v.id} className="border-t">
                <td className="p-2">{v.name}</td>
                <td className="p-2">{v.registration_number}</td>
                <td className="p-2">{v.vehicle_type}</td>
                <td className="p-2">{v.status}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No vehicles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
