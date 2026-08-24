import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAllApiKeys, listAllWebhooks, listAllOAuthConnections } from "@/platform/admin.integrations.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Radio, Link2 } from "lucide-react";

export const Route = createFileRoute("/_platform/admin/api")({ component: Page });

function Page() {
  const keys = useQuery({ queryKey: ["admin", "api-keys"], queryFn: () => listAllApiKeys({}) });
  const webhooks = useQuery({ queryKey: ["admin", "webhooks"], queryFn: () => listAllWebhooks({}) });
  const oauth = useQuery({ queryKey: ["admin", "oauth"], queryFn: () => listAllOAuthConnections({}) });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="API & Webhooks" description="System-wide API keys, webhooks and OAuth connections." />
      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><Key className="mr-2 h-4 w-4" /> API Keys</TabsTrigger>
          <TabsTrigger value="webhooks"><Radio className="mr-2 h-4 w-4" /> Webhooks</TabsTrigger>
          <TabsTrigger value="oauth"><Link2 className="mr-2 h-4 w-4" /> OAuth</TabsTrigger>
        </TabsList>
        <TabsContent value="keys">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">{(keys.data ?? []).map((row: any) => (
              <div key={row.id} className="p-4 text-sm"><span className="font-medium">{row.name}</span> · <Badge variant="outline">{row.status}</Badge> · {row.key_prefix}...</div>
            ))}</div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="webhooks">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">{(webhooks.data ?? []).map((row: any) => (
              <div key={row.id} className="p-4 text-sm"><span className="font-medium">{row.name}</span> · <span className="text-muted-foreground">{row.url}</span> · <Badge variant="outline">{row.status}</Badge></div>
            ))}</div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="oauth">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">{(oauth.data ?? []).map((row: any) => (
              <div key={row.id} className="p-4 text-sm"><span className="font-medium">{row.provider}</span> · <Badge variant="outline">{row.status}</Badge></div>
            ))}</div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
