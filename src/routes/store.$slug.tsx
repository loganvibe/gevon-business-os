import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicStorefront } from "@/modules/commerce/api/store.functions";

export const Route = createFileRoute("/store/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicStorefront({ data: { slug: params.slug } });
    if (!data.store) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = (loaderData as any)?.store?.name ?? "Store";
    const desc = (loaderData as any)?.store?.tagline ?? `Shop from ${name} online.`;
    return {
      meta: [
        { title: `${name} — Online Store` },
        { name: "description", content: String(desc).slice(0, 155) },
        { property: "og:title", content: `${name} — Online Store` },
        { property: "og:description", content: String(desc).slice(0, 155) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <p className="p-8 text-center text-muted-foreground">This store is unavailable.</p>,
  notFoundComponent: () => <p className="p-8 text-center text-muted-foreground">Store not found.</p>,
  component: Storefront,
});

function Storefront() {
  const { store, products } = Route.useLoaderData() as any;
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{store.name}</h1>
        {store.tagline && <p className="text-muted-foreground">{store.tagline}</p>}
        {store.description && <p className="text-sm text-muted-foreground">{store.description}</p>}
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: any) => (
          <article key={p.id} className="rounded-lg border bg-card p-4">
            <h2 className="font-medium">{p.name}</h2>
            {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
            <p className="mt-2 font-semibold">
              {store.currency_code} {Number(p.price).toLocaleString()}
            </p>
          </article>
        ))}
        {products.length === 0 && <p className="text-sm text-muted-foreground">No products published yet.</p>}
      </section>
      <footer className="border-t pt-4 text-sm text-muted-foreground">
        {store.contact_phone && <p>Call: {store.contact_phone}</p>}
        {store.address && <p>{store.address}</p>}
      </footer>
    </main>
  );
}
