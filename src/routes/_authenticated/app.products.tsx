import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createProduct, listProducts } from "@/modules/inventory/api/products.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fnList = useServerFn(listProducts);
  const fnCreate = useServerFn(createProduct);
  const { data } = useQuery({
    queryKey: ["products", companyId], enabled: !!companyId,
    queryFn: () => fnList({ data: { companyId: companyId!, limit: 100 } }),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", costPrice: 0, sellingPrice: 0 });

  async function submit() {
    if (!companyId || !form.name.trim()) return;
    try {
      await fnCreate({ data: { companyId, name: form.name, sku: form.sku || undefined, costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice) } });
      toast.success("Product created");
      setOpen(false);
      setForm({ name: "", sku: "", costPrice: 0, sellingPrice: 0 });
      qc.invalidateQueries({ queryKey: ["products", companyId] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Products</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New product</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cost price</Label><Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} /></div>
                <div><Label>Selling price</Label><Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} /></div>
              </div>
              <Button onClick={submit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">SKU</th>
            <th className="text-right p-2">Cost</th><th className="text-right p-2">Selling</th>
            <th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2 text-muted-foreground">{p.sku ?? "—"}</td>
                <td className="p-2 text-right">{Number(p.cost_price).toLocaleString()}</td>
                <td className="p-2 text-right">{Number(p.selling_price).toLocaleString()}</td>
                <td className="p-2">{p.status}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
