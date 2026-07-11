import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listMyNotifications,
  markNotificationRead,
  markAllRead,
  archiveNotification,
} from "@/platform/notifications/notify.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/notifications")({ component: Page });

function Page() {
  const list = useServerFn(listMyNotifications);
  const mark = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllRead);
  const archive = useServerFn(archiveNotification);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"unread" | "all" | "archived">("unread");
  const { data } = useQuery({
    queryKey: ["notifications", "list", status],
    queryFn: () => list({ data: { status } }),
  });

  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Inbox" title="Notifications" description="All alerts, updates, and system messages." />
      <div className="flex flex-wrap items-center gap-2">
        {(["unread", "all", "archived"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s[0].toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={async () => { await markAll({}); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
          Mark all read
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {rows.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{n.title}</span>
                    <Badge variant="outline" className="text-[10px]">{n.category}</Badge>
                    {n.priority !== "normal" && <Badge className="text-[10px]">{n.priority}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-1">
                  {n.status === "unread" && (
                    <Button size="sm" variant="ghost" onClick={async () => { await mark({ data: { id: n.id } }); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
                      Mark read
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={async () => { await archive({ data: { id: n.id } }); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="p-8 text-center text-muted-foreground">Nothing here.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
