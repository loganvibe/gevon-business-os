import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAIUsage } from "@/platform/ai.functions";
import { useActiveCompany } from "@/routes/_authenticated/app";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/settings/ai-usage")({ component: Page });

function Page() {
  const company = useActiveCompany();
  const fn = useServerFn(getMyAIUsage);
  const { data } = useQuery({
    queryKey: ["ai-usage", company.id],
    queryFn: () => fn({ data: { companyId: company.id, limit: 100 } }),
  });

  const wallet = data?.wallet;
  const usage = data?.usage ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Settings" title="AI Usage" description="Monitor your workspace AI consumption and credits." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Monthly Limit</div>
            <div className="mt-1 font-display text-xl font-semibold">{wallet?.monthlyLimit ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Bonus Credits</div>
            <div className="mt-1 font-display text-xl font-semibold">{wallet?.bonusCredits ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Consumed</div>
            <div className="mt-1 font-display text-xl font-semibold">{wallet?.consumed ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="mt-1 font-display text-xl font-semibold">{wallet?.remaining ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capability</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((u: any) => (
                <TableRow key={u.id ?? `${u.capability_key}-${u.created_at}`}>
                  <TableCell className="font-mono text-xs">{u.capability_key}</TableCell>
                  <TableCell className="text-xs">{u.model}</TableCell>
                  <TableCell>{u.total_tokens}</TableCell>
                  <TableCell>{u.credits_used}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "success" ? "default" : "destructive"}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {usage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No AI usage yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
