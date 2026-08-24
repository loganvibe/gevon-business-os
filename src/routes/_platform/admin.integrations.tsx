import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAllIntegrations, createRegistryEntry, updateRegistryEntry, toggleIntegrationStatus } from "@/platform/admin.integrations.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plug } from "lucide-react";

export const Route = createFileRoute("/_platform/admin/integrations")({ component: Page });

function Page() {
  const list = useQuery({ queryKey: ["admin", "integrations"], queryFn: () => adminListIntegrations({}) });
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (v: { id: string; status: string }) => toggleIntegrationStatus({ data: v }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin", "integrations"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Integrations" description="Manage integration registry and provider availability." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(list.data ?? []).map((row: any) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-medium">{row.name}</span>
                    <Badge variant="outline">{row.provider}</Badge>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {row.category} · {row.stats?.total ?? 0} companies connected · {row.stats?.active ?? 0} active · {row.stats?.error ?? 0} errors
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: row.id, status: row.status === "active" ? "paused" : "active" })}>
                    {row.status === "active" ? "Pause" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
            {(list.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No integrations registered.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
