import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { listProducts } from "@/modules/inventory/api/products.functions";
import { createCheckout, addCartItem, removeCartItem, completeCheckout, getCart } from "@/modules/commerce/api/checkout.functions";
import { getOpenSession, openSession, closeSession } from "@/modules/commerce/api/pos.functions";

export const Route = createFileRoute("/_authenticated/app/pos")({
  component: PosPage,
  head: () => ({
    meta: [
      { title: "Point of Sale — Gevon BusinessOS" },
      { name: "description", content: "Fast checkout: search products, build a cart, take payment and issue a receipt." },
      { property: "og:title", content: "Point of Sale — Gevon BusinessOS" },
      { property: "og:description", content: "Quick sale checkout for retail, restaurants and services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const METHODS = ["cash", "transfer", "card", "other"] as const;

function PosPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const [opening, setOpening] = useState(0);
  const [counted, setCounted] = useState(0);
  const qc = useQueryClient();

  useEffect(() => {
    const cid = localStorage.getItem("gevon:activeCompanyId");
    setCompanyId(cid);
    if (cid) {
      supabase
        .from("branches")
        .select("id")
        .eq("company_id", cid)
        .eq("is_headquarters", true)
        .maybeSingle()
        .then(({ data }) => data && setBranchId((data as any).id));
    }
  }, []);

  const fnProducts = useServerFn(listProducts);
  const fnCreateCart = useServerFn(createCheckout);
  const fnAdd = useServerFn(addCartItem);
  const fnRemove = useServerFn(removeCartItem);
  const fnComplete = useServerFn(completeCheckout);
  const fnCart = useServerFn(getCart);
  const fnOpenSession = useServerFn(getOpenSession);
  const fnOpen = useServerFn(openSession);
  const fnClose = useServerFn(closeSession);

  const { data: session } = useQuery({
    queryKey: ["pos", "session", companyId],
    queryFn: () => fnOpenSession({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const { data: products } = useQuery({
    queryKey: ["products", "pos", companyId],
    queryFn: () => fnProducts({ data: { companyId: companyId!, status: "active" } }),
    enabled: !!companyId,
  });

  const { data: cart, refetch: refetchCart } = useQuery({
    queryKey: ["pos", "cart", cartId],
    queryFn: () => fnCart({ data: { cartId: cartId! } }),
    enabled: !!cartId,
  });

  const filtered = useMemo(() => {
    const list = (products?.items ?? []) as any[];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 24);
    return list.filter((p) => `${p.name} ${p.sku ?? ""} ${p.barcode ?? ""}`.toLowerCase().includes(q)).slice(0, 24);
  }, [products, search]);

  async function ensureCart(): Promise<string> {
    if (cartId) return cartId;
    const c: any = await fnCreateCart({ data: { companyId: companyId!, branchId, channel: "walk_in" } });
    setCartId(c.id);
    return c.id;
  }

  async function add(product: any) {
    try {
      const id = await ensureCart();
      await fnAdd({ data: { cartId: id, productId: product.id, quantity: 1 } });
      await refetchCart();
    } catch (e: any) {
      toast.error(e.message ?? "Could not add item");
    }
  }

  async function checkout() {
    if (!cartId) return;
    try {
      const res: any = await fnComplete({
        data: { cartId, paymentMethod: method, posSessionId: (session as any)?.id ?? null, issueReceipt: true },
      });
      toast.success(`Sale ${res.saleNumber} completed`);
      setCartId(null);
      qc.invalidateQueries({ queryKey: ["commerce"] });
      qc.invalidateQueries({ queryKey: ["pos", "session", companyId] });
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    }
  }

  const items = (cart as any)?.items ?? [];
  const total = (cart as any)?.cart?.total ?? 0;

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Point of sale</h1>
          <p className="text-sm text-muted-foreground">Quick sale — customer details are optional.</p>
        </div>
        {session ? (
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="counted" className="text-xs">Counted cash</Label>
              <Input id="counted" type="number" value={counted} onChange={(e) => setCounted(Number(e.target.value))} className="w-32" />
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await fnClose({ data: { sessionId: (session as any).id, countedCash: counted } });
                toast.success("Session closed");
                qc.invalidateQueries({ queryKey: ["pos", "session", companyId] });
              }}
            >
              Close session
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="opening" className="text-xs">Opening balance</Label>
              <Input id="opening" type="number" value={opening} onChange={(e) => setOpening(Number(e.target.value))} className="w-32" />
            </div>
            <Button
              onClick={async () => {
                await fnOpen({ data: { companyId: companyId!, branchId, openingBalance: opening } });
                toast.success("Session opened");
                qc.invalidateQueries({ queryKey: ["pos", "session", companyId] });
              }}
            >
              Open session
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <Input
            placeholder="Search or scan a barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p: any) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="rounded-lg border bg-card p-3 text-left transition hover:border-primary"
              >
                <p className="font-medium leading-tight">{p.name}</p>
                <p className="text-sm text-muted-foreground">₦{Number(p.selling_price ?? 0).toLocaleString()}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No products match.</p>}
          </div>
        </section>

        <aside className="rounded-lg border bg-card p-4 space-y-3 h-fit">
          <h2 className="font-medium">Cart</h2>
          {items.length === 0 && <p className="text-sm text-muted-foreground">Tap a product to start.</p>}
          <ul className="space-y-2">
            {items.map((it: any) => (
              <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {it.name_snapshot} × {Number(it.quantity)}
                </span>
                <span className="flex items-center gap-2">
                  ₦{Number(it.total).toLocaleString()}
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await fnRemove({ data: { itemId: it.id } });
                      await refetchCart();
                    }}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-3 font-semibold">
            <span>Total</span>
            <span>₦{Number(total).toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <Button key={m} size="sm" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                {m}
              </Button>
            ))}
          </div>
          <Button className="w-full" disabled={items.length === 0} onClick={checkout}>
            Complete sale
          </Button>
        </aside>
      </div>
    </div>
  );
}
