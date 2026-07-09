import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, ShieldCheck, Sparkles, Globe2, Layers, Zap } from "lucide-react";

const TITLE = "Gevon BusinessOS — The Operating System for African Businesses";
const DESCRIPTION =
  "Run every part of your business — CRM, inventory, sales, accounting, HR, payments — from one AI-native platform, built multi-company, multi-currency, multi-country from day one.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: Boxes, name: "CRM & Sales", desc: "Customers, pipeline, quotes, invoicing." },
  { icon: Layers, name: "Inventory", desc: "Multi-warehouse stock, transfers, POs." },
  { icon: Sparkles, name: "AI Copilot", desc: "Embedded across every module." },
  { icon: Globe2, name: "Multi-country", desc: "Currencies, taxes, locales — configurable." },
  { icon: ShieldCheck, name: "Enterprise security", desc: "RBAC, RLS, audit logs by default." },
  { icon: Zap, name: "Modular & plugin-ready", desc: "Enable only what you need." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
          <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 lg:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Built in Africa, for African businesses
              </span>
              <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
                The operating system for <span className="text-brand">African businesses</span>.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
                {DESCRIPTION}
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:brightness-110"
                >
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  View pricing
                </Link>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Multi-company · Multi-branch · 14 African & global currencies · English · Français · العربية · Kiswahili
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="font-display text-sm font-medium uppercase tracking-widest text-brand">
                One platform
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Every module your business needs, working as one.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Turn on what you need, when you need it. Every module respects your roles, permissions,
                branches, and currencies out of the box.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <div
                  key={m.name}
                  className="group rounded-xl border border-border bg-card p-6 transition hover:border-brand/40 hover:shadow-elev-2"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{m.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-balance">
              Ready to run your business from one place?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Set up your company in minutes. Invite your team. Turn on the modules you need.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:brightness-110"
            >
              Create your Gevon account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow">
            <span className="font-display text-sm font-bold">G</span>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Gevon</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
          <Link to="/pricing" className="transition hover:text-foreground">Pricing</Link>
          <Link to="/legal/privacy" className="transition hover:text-foreground">Privacy</Link>
          <Link to="/legal/terms" className="transition hover:text-foreground">Terms</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:brightness-110"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-sm font-semibold">Gevon Technologies</p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Gevon Technologies. All rights reserved.</p>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/pricing" className="transition hover:text-foreground">Pricing</Link>
          <Link to="/legal/privacy" className="transition hover:text-foreground">Privacy</Link>
          <Link to="/legal/terms" className="transition hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
