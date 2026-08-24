import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAppKeys, createAppKey, revokeAppKey } from "@/modules/integrations/api/developer-apps.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_platform/developers/keys")({ component: Page });

function Page() {
  const [appId] = useState(() => {
    const id = localStorage.getItem("gevon:activeCompanyId");
    return id || "";
  });
  const list = useQuery({ queryKey: ["app-keys", appId], queryFn: () => listAppKeys({ data: { appId } }) });
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () => createAppKey({ data: { appId } }),
    onSuccess: (d: any) => { toast.success(`Key created: ${d.prefix}...`); qc.invalidateQueries({ queryKey: ["app-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeAppKey({ data: { id } }),
    onSuccess: () => { toast.success("Key revoked"); qc.invalidateQueries({ queryKey: ["app-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Developers" title="API Keys" description="Generate and revoke application credentials." />
      <Card>
        <CardContent className="p-4">
          <Button onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" /> Generate new key</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(list.data ?? []).map((row: any) => (
              <div key={row.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{row.key_prefix}...</div>
                  <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
                </div>
                {row.status === "active" && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {(list.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No keys yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
