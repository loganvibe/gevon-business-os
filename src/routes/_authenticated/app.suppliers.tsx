import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createSupplier, listSuppliers } from "@/modules/inventory/server/suppliers.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fnList = useServerFn(listSuppliers);
  const fnCreate = useServerFn(createSupplier);
  const { data } = useQuery({
    queryKey: ["suppliers", companyId], enabled: !!companyId,
    queryFn: () => fnList({ data: { companyId: companyId! } }),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  async function submit() {
    if (!companyId || !form.name.trim()) return;
    try {
      await fnCreate({ data: { companyId, name: form.name, phone: form.phone || undefined, email: form.email || undefined } });
      toast.success("Supplier created");
      setOpen(false);
      setForm({ name: "", phone: "", email: "" });
      qc.invalidateQueries({ queryKey: ["suppliers", companyId] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Suppliers</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New supplier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New supplier</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Phone</th>
            <th className="text-left p-2">Email</th><th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.phone ?? "—"}</td>
                <td className="p-2">{s.email ?? "—"}</td>
                <td className="p-2">{s.status}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
