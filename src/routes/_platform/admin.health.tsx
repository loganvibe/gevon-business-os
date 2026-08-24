import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { runSystemHealthCheck } from "@/platform/admin.health.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/admin/health")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const checks = useQuery({ queryKey: ["admin", "health"], queryFn: () => runSystemHealthCheck({ data: {} }), refetchInterval: 30000 });
  const run = useMutation({ mutationFn: () => runSystemHealthCheck({ data: {} }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "health"] }); toast.success("Health check complete"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="System Health" description="Real-time platform status and diagnostics." actions={
        <Button onClick={() => run.mutate()}><RefreshCw className="mr-2 h-4 w-4" /> Run check</Button>
      } />
      <div className="grid gap-4 md:grid-cols-2">
        {(checks.data ?? []).map((check: any) => (
          <Card key={check.checkName}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4" />
                <div>
                  <div className="font-medium text-sm">{check.checkName}</div>
                  <div className="text-xs text-muted-foreground">{check.message}</div>
                </div>
              </div>
              <Badge variant={check.status === "healthy" ? "default" : check.status === "degraded" ? "secondary" : "destructive"}>{check.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
