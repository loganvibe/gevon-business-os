import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_platform/admin/analytics")({ component: Page });

function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Analytics" description="Cross-tenant platform analytics." />
      <Card>
        <CardHeader><CardTitle className="text-base">Coming soon</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Detailed platform analytics (MRR, active companies, module adoption, feature-flag rollout progress) land in a later milestone. The <a className="underline" href="/admin">Overview</a> shows live counts today.
        </CardContent>
      </Card>
    </div>
  );
}
