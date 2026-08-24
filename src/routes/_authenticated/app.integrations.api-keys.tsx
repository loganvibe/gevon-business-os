import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listApiKeys, createApiKey, revokeApiKey } from "@/modules/integrations/api/api-keys.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations/api-keys")({ component: Page });

function Page() {
  const [companyId] = useState(() => {
    const id = localStorage.getItem("gevon:activeCompanyId");
    return id || "";
  });
  const list = useQuery({ queryKey: ["api-keys", companyId], queryFn: () => listApiKeys({ data: { companyId } }) });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => createApiKey({ data: { companyId, name, scopes: ["sales.read", "inventory.read", "orders.read"] } }),
    onSuccess: (d: any) => {
      toast.success(`API key created: ${d.prefix}...`);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiKey({ data: { id } }),
    onSuccess: () => { toast.success("API key revoked"); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integrations" title="API keys" description="Manage external API access." />
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} />
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
                  <div className="text-sm text-muted-foreground">Prefix: {row.key_prefix}... · Status: <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge></div>
                </div>
                {row.status === "active" && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {(list.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No API keys yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
