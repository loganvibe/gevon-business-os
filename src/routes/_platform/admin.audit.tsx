import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminAuditLog } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_platform/admin/audit")({ component: Page });

function Page() {
  const fn = useServerFn(adminAuditLog);
  const [action, setAction] = useState("");
  const { data } = useQuery({
    queryKey: ["admin","audit", action],
    queryFn: () => fn({ data: { action: action || undefined, limit: 200 } }),
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Global Audit Log" description="Every mutation across every company." />
      <Input placeholder="Filter action…" value={action} onChange={(e) => setAction(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border text-sm">
            {(data ?? []).map((r: any) => (
              <div key={r.id} className="grid gap-1 p-3 sm:grid-cols-[160px_1fr_120px]">
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div>
                  <Badge variant="outline" className="mr-2">{r.action}</Badge>
                  <span className="text-muted-foreground">{r.entity_type}</span>
                  {r.entity_id && <span className="ml-1 text-xs text-muted-foreground">#{String(r.entity_id).slice(0,8)}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.company_id ? `co:${String(r.company_id).slice(0,8)}` : "platform"}
                </div>
              </div>
            ))}
            {(data?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-muted-foreground">No audit entries.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
