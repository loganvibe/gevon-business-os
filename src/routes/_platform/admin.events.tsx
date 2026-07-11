import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRegisteredEvents } from "@/platform/events/bus.functions";
import { syncEventRegistry } from "@/platform/events/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/admin/events")({ component: Page });

function Page() {
  const list = useServerFn(listRegisteredEvents);
  const sync = useServerFn(syncEventRegistry);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "events"], queryFn: () => list({}) });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader
        eyebrow="Platform"
        title="Event Registry"
        description="Catalog of every platform event. Publishers, subscribers, and versions."
        actions={
          <Button onClick={async () => { const r = await sync({}); toast.success(`Synced ${r.synced} events`); qc.invalidateQueries({ queryKey: ["admin", "events"] }); }}>
            Sync from code
          </Button>
        }
      />
      <div className="grid gap-3">
        {(data?.events ?? []).map((e: any) => (
          <Card key={e.key}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{e.key}</span>
                <Badge variant="outline">v{e.version}</Badge>
                {e.publisher_module_id && <Badge variant="secondary">{e.publisher_module_id}</Badge>}
                {!e.is_active && <Badge variant="destructive">inactive</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{(e.subscribers as any[]).length} subscriber(s)</p>
            </CardContent>
          </Card>
        ))}
        {(data?.events?.length ?? 0) === 0 && (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No events synced yet. Click "Sync from code".
          </div>
        )}
      </div>
    </div>
  );
}
