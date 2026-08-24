import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMaintenanceRequests, createMaintenanceRequest } from "@/modules/enterprise/api/maintenance.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/maintenance")({
  component: MaintenancePage,
});

function MaintenancePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listMaintenanceRequests);
  const fnCreate = useServerFn(createMaintenanceRequest);
  const { data } = useQuery({
    queryKey: ["maintenance", companyId],
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
    enabled: !!companyId,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", maintenanceType: "corrective" as const, priority: "normal" });

  async function submit() {
    if (!companyId || !form.title.trim()) return;
    try {
      await fnCreate({ data: { companyId, title: form.title, description: form.description || undefined, maintenanceType: form.maintenanceType, priority: form.priority } });
      toast.success("Maintenance request created");
      setOpen(false);
      setForm({ title: "", description: "", maintenanceType: "corrective", priority: "normal" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Maintenance</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New maintenance request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Priority</Label><Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Number</th><th className="text-left p-2">Title</th>
            <th className="text-left p-2">Type</th><th className="text-left p-2">Status</th>
            <th className="text-left p-2">Priority</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((m: any) => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.request_number}</td>
                <td className="p-2">{m.title}</td>
                <td className="p-2">{m.maintenance_type}</td>
                <td className="p-2">{m.status}</td>
                <td className="p-2">{m.priority}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No maintenance requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
