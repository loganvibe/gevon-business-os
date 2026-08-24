import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWarehouses, createWarehouse } from "@/modules/enterprise/api/warehouses.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/warehouses")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listWarehouses);
  const fnCreate = useServerFn(createWarehouse);
  const { data } = useQuery({
    queryKey: ["warehouses", companyId],
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
    enabled: !!companyId,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "" });

  async function submit() {
    if (!companyId || !form.name.trim()) return;
    try {
      await fnCreate({ data: { companyId, name: form.name, code: form.code || undefined, address: form.address || undefined } });
      toast.success("Warehouse created");
      setOpen(false);
      setForm({ name: "", code: "", address: "" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Warehouses</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New warehouse</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New warehouse</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Code</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Branch</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((w: any) => (
              <tr key={w.id} className="border-t">
                <td className="p-2">{w.name}</td>
                <td className="p-2 text-muted-foreground">{w.code ?? "—"}</td>
                <td className="p-2">{w.status}</td>
                <td className="p-2">{w.branches?.name ?? "—"}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No warehouses yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
