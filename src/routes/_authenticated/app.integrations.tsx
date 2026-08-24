import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Plug, Key, Radio, FileJson } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  component: IntegrationsShell,
});

const NAV = [
  { to: "/app/integrations", label: "All integrations", icon: Plug, exact: true },
  { to: "/app/integrations/api-keys", label: "API keys", icon: Key },
  { to: "/app/integrations/webhooks", label: "Webhooks", icon: Radio },
  { to: "/app/integrations/import-export", label: "Data import / export", icon: FileJson },
];

function IntegrationsShell() {
  const location = useLocation();
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <h1 className="font-display text-2xl font-semibold">Integrations</h1>
      <div className="flex gap-2 border-b border-border">
        {NAV.map((item) => {
          const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition ${
                isActive ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
