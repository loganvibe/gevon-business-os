import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCompanyIntegrations, createCompanyIntegration, deleteCompanyIntegration, testConnection } from "@/modules/integrations/api/company-integrations.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plug, Plus, Trash2, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations/")({ component: Page });

function Page() {
  const list = useQuery({ queryKey: ["company-integrations"], queryFn: () => listCompanyIntegrations({}) });
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: string) => deleteCompanyIntegration({ data: { id } }),
    onSuccess: () => { toast.success("Disconnected"); qc.invalidateQueries({ queryKey: ["company-integrations"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: (id: string) => testConnection({ data: { id } }),
    onSuccess: (d: any) => toast.success(d.message),
    onError: (e: any) => toast.error(e.message),
  });

  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integrations" title="All integrations" description="Connect and manage external services." actions={
        <Button><Plus className="mr-2 h-4 w-4" /> Connect integration</Button>
      } />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {rows.map((row: any) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-medium">{row.name}</span>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {row.integration_registries?.name} · {row.integration_registries?.provider}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => test.mutate(row.id)}><Play className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No integrations connected yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
