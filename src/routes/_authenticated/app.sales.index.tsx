import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSales, completeSale, cancelSale, createDraftSale } from "@/modules/sales/server/sales.functions";
import { listProducts } from "@/modules/inventory/server/products.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/sales/")({
  component: SalesOverview,
});

type LineItem = { productId: string; name: string; quantity: number; unitPrice: number };

function SalesOverview() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  useEffect(() => {
    const cid = localStorage.getItem("gevon:activeCompanyId");
    setCompanyId(cid);
    if (cid) {
      supabase.from("branches").select("id").eq("company_id", cid).eq("is_headquarters", true).maybeSingle()
        .then(({ data }) => data && setBranchId((data as any).id));
    }
  }, []);
  const qc = useQueryClient();
  const fnList = useServerFn(listSales);
  const fnComplete = useServerFn(completeSale);
  const fnCancel = useServerFn(cancelSale);
  const fnCreate = useServerFn(createDraftSale);
  const fnProducts = useServerFn(listProducts);

  const { data } = useQuery({
    queryKey: ["sales", "list", companyId],
    queryFn: () => fnList({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const { data: products } = useQuery({
    queryKey: ["products", "for-sale", companyId],
    queryFn: () => fnProducts({ data: { companyId: companyId!, status: "active" } }),
    enabled: !!companyId,
  });

  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [pickerId, setPickerId] = useState<string>("");
  const [pickerQty, setPickerQty] = useState<number>(1);

  function addLine() {
    const p = (products?.items ?? []).find((x: any) => x.id === pickerId);
    if (!p) return;
    setLines((l) => [...l, { productId: p.id, name: p.name, quantity: pickerQty, unitPrice: Number(p.selling_price ?? 0) }]);
    setPickerId(""); setPickerQty(1);
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  async function submit(complete: boolean) {
    if (!companyId || !branchId || lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    try {
      const res = await fnCreate({
        data: {
          companyId, branchId, channel: "walk_in",
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        },
      });
      if (complete) {
        await fnComplete({ data: { saleId: (res as any).id } });
        toast.success("Sale completed");
      } else {
        toast.success("Draft saved");
      }
      setOpen(false); setLines([]);
      qc.invalidateQueries({ queryKey: ["sales"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  async function complete(id: string) {
    try { await fnComplete({ data: { saleId: id } }); toast.success("Completed"); qc.invalidateQueries({ queryKey: ["sales"] }); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  }
  async function cancel(id: string) {
    try { await fnCancel({ data: { saleId: id } }); toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["sales"] }); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Sales</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New sale</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New sale</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Product</Label>
                  <select value={pickerId} onChange={(e) => setPickerId(e.target.value)} className="w-full border rounded h-9 px-2 text-sm bg-background">
                    <option value="">Select…</option>
                    {(products?.items ?? []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — {Number(p.selling_price ?? 0).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24"><Label>Qty</Label><Input type="number" min={1} value={pickerQty} onChange={(e) => setPickerQty(Number(e.target.value))} /></div>
                <Button variant="secondary" onClick={addLine}>Add</Button>
              </div>
              <div className="border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="text-left p-2">Product</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Total</th></tr></thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{l.name}</td>
                        <td className="p-2 text-right">{l.quantity}</td>
                        <td className="p-2 text-right">{l.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right">{(l.quantity * l.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                    {lines.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No items</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-xl font-semibold">{subtotal.toLocaleString()}</div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => submit(false)}>Save draft</Button>
                <Button onClick={() => submit(true)}>Complete sale</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Number</th>
            <th className="text-left p-2">Channel</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Payment</th>
            <th className="text-right p-2">Total</th>
            <th className="text-left p-2">Created</th>
            <th className="text-right p-2">Actions</th>
          </tr></thead>
          <tbody>
            {(data?.items ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-mono text-xs">{s.sale_number}</td>
                <td className="p-2">{s.channel}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">{s.payment_status}</td>
                <td className="p-2 text-right">{Number(s.total).toLocaleString()}</td>
                <td className="p-2">{new Date(s.created_at).toLocaleString()}</td>
                <td className="p-2 text-right space-x-2">
                  {s.status === "draft" && <>
                    <Button size="sm" variant="outline" onClick={() => complete(s.id)}>Complete</Button>
                    <Button size="sm" variant="ghost" onClick={() => cancel(s.id)}>Cancel</Button>
                  </>}
                </td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No sales yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
