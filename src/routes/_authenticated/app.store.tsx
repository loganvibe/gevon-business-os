import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listStores, createStore, updateStore, listStoreProducts, publishProduct } from "@/modules/commerce/api/store.functions";
import { listProducts } from "@/modules/inventory/api/products.functions";

export const Route = createFileRoute("/_authenticated/app/store")({
  component: StorePage,
  head: () => ({
    meta: [
      { title: "Online Store — Gevon BusinessOS" },
      { name: "description", content: "Publish your catalogue online. Only products you choose are ever public." },
      { property: "og:title", content: "Online Store — Gevon BusinessOS" },
      { property: "og:description", content: "A storefront built on the products you already manage in Gevon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function StorePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);
  const qc = useQueryClient();
  const fnStores = useServerFn(listStores);
  const fnCreate = useServerFn(createStore);
  const fnUpdate = useServerFn(updateStore);
  const fnStoreProducts = useServerFn(listStoreProducts);
  const fnPublish = useServerFn(publishProduct);
  const fnProducts = useServerFn(listProducts);

  const { data: stores } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: () => fnStores({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const store = (stores?.items ?? [])[0] as any | undefined;

  const { data: published } = useQuery({
    queryKey: ["store-products", store?.id],
    queryFn: () => fnStoreProducts({ data: { storeId: store!.id } }),
    enabled: !!store?.id,
  });
  const { data: products } = useQuery({
    queryKey: ["products", "store", companyId],
    queryFn: () => fnProducts({ data: { companyId: companyId!, status: "active" } }),
    enabled: !!companyId,
  });

  const publishedIds = new Set((published?.items ?? []).filter((p: any) => p.is_published).map((p: any) => p.product_id));

  if (!store) {
    return (
      <div className="p-6 space-y-4 max-w-lg">
        <h1 className="text-2xl font-semibold">Online store</h1>
        <p className="text-sm text-muted-foreground">Create a storefront for your business. Nothing is public until you publish it.</p>
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div>
            <Label htmlFor="sname">Store name</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sslug">Web address</Label>
            <Input id="sslug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="my-shop" />
          </div>
          <Button
            disabled={!companyId || name.length < 2 || slug.length < 2}
            onClick={async () => {
              try {
                await fnCreate({ data: { companyId: companyId!, name, slug } });
                toast.success("Store created");
                qc.invalidateQueries({ queryKey: ["stores", companyId] });
              } catch (e: any) {
                toast.error(e.message ?? "Could not create store");
              }
            }}
          >
            Create store
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">/store/{store.slug} · {store.is_published ? "Published" : "Not published"}</p>
        </div>
        <Button
          variant={store.is_published ? "outline" : "default"}
          onClick={async () => {
            await fnUpdate({ data: { storeId: store.id, isPublished: !store.is_published } });
            qc.invalidateQueries({ queryKey: ["stores", companyId] });
          }}
        >
          {store.is_published ? "Unpublish" : "Publish store"}
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Catalogue</h2>
        <div className="rounded-lg border bg-card divide-y">
          {(products?.items ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>{p.name}</span>
              <Button
                size="sm"
                variant={publishedIds.has(p.id) ? "outline" : "default"}
                onClick={async () => {
                  await fnPublish({
                    data: {
                      companyId: companyId!,
                      storeId: store.id,
                      productId: p.id,
                      isPublished: !publishedIds.has(p.id),
                    },
                  });
                  qc.invalidateQueries({ queryKey: ["store-products", store.id] });
                }}
              >
                {publishedIds.has(p.id) ? "Remove" : "Publish"}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
