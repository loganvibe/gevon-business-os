import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminSummary } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_platform/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const fn = useServerFn(adminSummary);
  const { data } = useQuery({ queryKey: ["admin", "summary"], queryFn: () => fn({}) });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Overview" description="Real-time snapshot of the Gevon platform." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={data?.companies} />
        <StatCard label="Platform admins" value={data?.platformAdmins} />
        <StatCard label="Modules" value={data?.modules} />
        <StatCard label="Feature flags" value={data?.featureFlags} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Subscriptions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            {(["trial","active","past_due","cancelled"] as const).map((k) => (
              <div key={k} className="rounded-md border border-border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.replace("_"," ")}</div>
                <div className="mt-1 font-display text-2xl">{data?.subscriptions[k] ?? 0}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-3xl">{value ?? "—"}</div>
      </CardContent>
    </Card>
  );
}
