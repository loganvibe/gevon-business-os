import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAssets, createAsset } from "@/modules/enterprise/api/assets.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/assets")({
  component: AssetsPage,
});

function AssetsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const fnList = useServerFn(listAssets);
  const fnCreate = useServerFn(createAsset);
  const { data } = useQuery({
    queryKey: ["assets", companyId],
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
    enabled: !!companyId,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", assetTag: "", serialNumber: "", model: "" });

  async function submit() {
    if (!companyId || !form.name.trim()) return;
    try {
      await fnCreate({ data: { companyId, name: form.name, assetTag: form.assetTag || undefined, serialNumber: form.serialNumber || undefined, model: form.model || undefined } });
      toast.success("Asset created");
      setOpen(false);
      setForm({ name: "", assetTag: "", serialNumber: "", model: "" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Assets</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New asset</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New asset</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Asset tag</Label><Input value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} /></div>
              <div><Label>Serial number</Label><Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Asset tag</th>
            <th className="text-left p-2">Serial</th><th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.name}</td>
                <td className="p-2 text-muted-foreground">{a.asset_tag ?? "—"}</td>
                <td className="p-2">{a.serial_number ?? "—"}</td>
                <td className="p-2">{a.status}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No assets yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
