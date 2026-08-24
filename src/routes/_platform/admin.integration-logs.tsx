import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listIntegrationLogs } from "@/platform/admin.integrations.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_platform/admin/integration-logs")({ component: Page });

function Page() {
  const logs = useQuery({ queryKey: ["admin", "integration-logs"], queryFn: () => listIntegrationLogs({ data: {} }) });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Integration logs" description="System-wide integration activity and errors." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(logs.data ?? []).map((row: any) => (
              <div key={row.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={row.level === "error" ? "destructive" : "secondary"}>{row.level}</Badge>
                  <span className="font-medium">{row.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{row.message}</div>
              </div>
            ))}
            {(logs.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No logs yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
