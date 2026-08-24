import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVendors, createVendor } from "@/modules/enterprise/api/vendors.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/vendors")({
  component: VendorsPage,
});

function VendorsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listVendors);
  const fnCreate = useServerFn(createVendor);
  const { data } = useQuery({
    queryKey: ["vendors", companyId],
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
    enabled: !!companyId,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", email: "", phone: "" });

  async function submit() {
    if (!companyId || !form.name.trim()) return;
    try {
      await fnCreate({ data: { companyId, name: form.name, code: form.code || undefined, email: form.email || undefined, phone: form.phone || undefined } });
      toast.success("Vendor created");
      setOpen(false);
      setForm({ name: "", code: "", email: "", phone: "" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vendors</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New vendor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Code</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Email</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((v: any) => (
              <tr key={v.id} className="border-t">
                <td className="p-2">{v.name}</td>
                <td className="p-2 text-muted-foreground">{v.code ?? "—"}</td>
                <td className="p-2">{v.status}</td>
                <td className="p-2">{v.email ?? "—"}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
