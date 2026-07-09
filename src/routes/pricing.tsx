import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

const TITLE = "Pricing — Gevon BusinessOS";
const DESCRIPTION = "Simple, transparent pricing for teams of every size. Scale from a single branch to a multi-country operation.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Pricing,
});

const tiers = [
  {
    name: "Starter",
    price: "Free",
    tag: "Get up and running",
    features: ["1 company, 1 branch", "Up to 3 users", "Core modules", "Community support"],
    cta: "Start free",
  },
  {
    name: "Business",
    price: "Contact",
    tag: "For growing teams",
    features: ["Unlimited branches", "Unlimited users", "All business modules", "Priority support", "AI Copilot"],
    cta: "Talk to sales",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    tag: "Multi-country operations",
    features: ["Multi-company consolidation", "SSO & SAML", "Custom modules & plugins", "Dedicated success manager", "SLA"],
    cta: "Talk to sales",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-brand">Pricing</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Grow into it.</h1>
          <p className="mt-4 text-muted-foreground">
            Start free. Scale to unlimited branches, currencies, and countries when you're ready.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl border p-8 ${
                t.featured
                  ? "border-brand bg-card shadow-glow"
                  : "border-border bg-card"
              }`}
            >
              <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
                {t.name}
              </p>
              <p className="mt-4 font-display text-4xl font-semibold">{t.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.tag}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`mt-8 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                  t.featured
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "border border-border bg-background hover:bg-secondary"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-12 text-center text-xs text-muted-foreground">
          Payment plans launch with the Payments module. Reach out for early access.
        </p>
      </div>
    </div>
  );
}
