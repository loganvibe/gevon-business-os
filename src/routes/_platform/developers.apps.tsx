import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDeveloperApps, createDeveloperApp } from "@/modules/integrations/api/developer-apps.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AppWindow, Plus } from "lucide-react";

export const Route = createFileRoute("/_platform/developers/apps")({ component: Page });

function Page() {
  const list = useQuery({ queryKey: ["developer-apps"], queryFn: () => listDeveloperApps({}) });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => createDeveloperApp({ data: { name, scopes: ["sales.read", "inventory.read"] } }),
    onSuccess: () => { toast.success("App created"); setName(""); qc.invalidateQueries({ queryKey: ["developer-apps"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Developers" title="Applications" description="Manage developer applications and OAuth clients." />
      <Card>
        <CardContent className="p-4 flex gap-2">
          <Input placeholder="App name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" /> Create app</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(list.data ?? []).map((row: any) => (
              <div key={row.id} className="p-4">
                <div className="font-medium">{row.name}</div>
                <div className="text-sm text-muted-foreground">Scopes: {(row.scopes ?? []).join(", ")}</div>
              </div>
            ))}
            {(list.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No developer apps yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
