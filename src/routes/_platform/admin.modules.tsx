import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListModules, setModuleGlobalStatus, syncManifests } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/admin/modules")({ component: Page });

function Page() {
  const list = useServerFn(adminListModules);
  const setStatus = useServerFn(setModuleGlobalStatus);
  const sync = useServerFn(syncManifests);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin","modules"], queryFn: () => list({}) });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: "active"|"deprecated"|"disabled_global" }) =>
      setStatus({ data: { moduleId: v.id, status: v.status } }),
    onSuccess: () => { toast.success("Module updated"); qc.invalidateQueries({ queryKey: ["admin","modules"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const syncMut = useMutation({
    mutationFn: () => sync({}),
    onSuccess: (r: any) => { toast.success(`Synced ${r.total} module(s) — ${r.inserted.length} new, ${r.updated.length} updated`); qc.invalidateQueries({ queryKey: ["admin","modules"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader
        eyebrow="Platform"
        title="Modules"
        description="Global module registry. Sync applies code manifests to the database."
        actions={<Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>Sync manifests</Button>}
      />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data ?? []).map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-medium">{m.name}</span>
                    <Badge variant="outline">v{m.version}</Badge>
                    <Badge>{m.subscription_tier}</Badge>
                    {m.is_core && <Badge className="bg-brand/20 text-brand">Core</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{m.description}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    id: <code>{m.id}</code> · category: {m.category}
                    {m.module_dependencies?.length ? ` · depends on: ${m.module_dependencies.map((d: any) => d.depends_on_id).join(", ")}` : ""}
                  </div>
                </div>
                <Select value={m.status} onValueChange={(v) => mut.mutate({ id: m.id, status: v as any })}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="disabled_global">Disabled (global)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            {(data?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No modules registered. Click "Sync manifests" to import from code.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
