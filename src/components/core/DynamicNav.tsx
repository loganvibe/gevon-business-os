import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNavigation } from "@/platform/customer.functions";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import * as Icons from "lucide-react";
import type { ComponentType } from "react";

function Icon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const pascal = name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const Cmp = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[pascal];
  if (!Cmp) return null;
  return <Cmp className={className} />;
}

/**
 * Renders sidebar navigation built from the module registry, filtered by
 * enabled modules × user permissions × feature flags — resolved server-side
 * via `getNavigation`.
 */
export function DynamicNav({ companyId }: { companyId: string }) {
  const location = useLocation();
  const fn = useServerFn(getNavigation);
  const { data } = useQuery({
    queryKey: ["nav", companyId],
    queryFn: () => fn({ data: { companyId } }),
    staleTime: 30_000,
  });

  return (
    <nav className="flex-1 space-y-3 p-3">
      {(data?.groups ?? []).map((group) => (
        <div key={group.moduleId} className="space-y-0.5">
          {(data?.groups.length ?? 0) > 1 && (
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              {group.moduleName}
            </div>
          )}
          {group.items.map((item) => {
            if (item.children?.length) {
              const openByDefault = location.pathname.startsWith(item.to);
              return (
                <Collapsible key={item.to} defaultOpen={openByDefault}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
                    <span className="flex items-center gap-3">
                      <Icon name={item.icon} className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60 transition group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => (
                      <NavLink key={child.to} to={child.to} icon={child.icon} label={child.label} pathname={location.pathname} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            return <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} pathname={location.pathname} exact />;
          })}
        </div>
      ))}
    </nav>
  );
}

function NavLink({ to, icon, label, pathname, exact }: { to: string; icon?: string; label: string; pathname: string; exact?: boolean }) {
  const isActive = exact ? pathname === to : (pathname === to || pathname.startsWith(to + "/"));
  return (
    <Link
      to={to as any}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </Link>
  );
}
