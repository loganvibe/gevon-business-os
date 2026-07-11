import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listCommunicationLogs } from "@/platform/comms/logs.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_platform/admin/communications")({ component: Page });

function Page() {
  const fn = useServerFn(listCommunicationLogs);
  const { data } = useQuery({ queryKey: ["admin", "comms"], queryFn: () => fn({ data: { limit: 200 } }), refetchInterval: 30_000 });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Communication Logs" description="Every send attempt across every channel." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border text-sm">
            {(data?.rows ?? []).map((r: any) => (
              <div key={r.id} className="grid gap-1 p-3 sm:grid-cols-[160px_80px_1fr_100px]">
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                <div><Badge variant="outline">{r.channel}</Badge></div>
                <div>
                  <div className="text-sm">{r.subject || r.template_key || "(no subject)"}</div>
                  <div className="text-xs text-muted-foreground">{r.recipient_address ?? (r.recipient_user_id ? `user:${String(r.recipient_user_id).slice(0,8)}` : "-")}</div>
                  {r.error && <div className="mt-1 text-xs text-destructive">{r.error}</div>}
                </div>
                <div><Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge></div>
              </div>
            ))}
            {(data?.rows?.length ?? 0) === 0 && <div className="p-8 text-center text-muted-foreground">No communication logs yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
