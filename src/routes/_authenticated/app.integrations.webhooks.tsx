import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listWebhooks, createWebhook, deleteWebhook, testWebhook } from "@/modules/integrations/api/webhooks.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Radio, Plus, Trash2, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations/webhooks")({ component: Page });

function Page() {
  const [companyId] = useState(() => {
    const id = localStorage.getItem("gevon:activeCompanyId");
    return id || "";
  });
  const list = useQuery({ queryKey: ["webhooks", companyId], queryFn: () => listWebhooks({ data: { companyId } }) });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const create = useMutation({
    mutationFn: () => createWebhook({ data: { companyId, name, url, events: ["sale.completed", "order.created"] } }),
    onSuccess: (d: any) => {
      toast.success(`Webhook created. Secret: ${d.secret}`);
      setName("");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteWebhook({ data: { id } }),
    onSuccess: () => { toast.success("Webhook deleted"); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const testHook = useMutation({
    mutationFn: (id: string) => testWebhook({ data: { id } }),
    onSuccess: (d: any) => toast.success(d.success ? "Delivery succeeded" : `Delivery failed: ${d.error}`),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integrations" title="Webhooks" description="Subscribe to Gevon events." />
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Webhook name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="https://example.com/hook" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" /> Create</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(list.data ?? []).map((row: any) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-sm text-muted-foreground">{row.url}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => testHook.mutate(row.id)}><Play className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {(list.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No webhooks configured.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
