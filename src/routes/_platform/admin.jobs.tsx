import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listJobs } from "@/platform/jobs/jobs.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_platform/admin/jobs")({ component: Page });

function Page() {
  const fn = useServerFn(listJobs);
  const { data } = useQuery({ queryKey: ["admin", "jobs"], queryFn: () => fn({ data: { limit: 200 } }), refetchInterval: 15_000 });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Background Jobs" description="Queue, retries, and failures across every tenant." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border text-sm">
            {(data?.rows ?? []).map((j: any) => (
              <div key={j.id} className="grid gap-1 p-3 sm:grid-cols-[160px_1fr_120px_100px]">
                <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</div>
                <div>
                  <span className="font-mono">{j.job_type}</span>
                  {j.last_error && <div className="mt-1 text-xs text-destructive">{j.last_error}</div>}
                </div>
                <div><Badge variant="outline">{j.status}</Badge></div>
                <div className="text-xs text-muted-foreground">{j.attempts}/{j.max_attempts}</div>
              </div>
            ))}
            {(data?.rows?.length ?? 0) === 0 && <div className="p-8 text-center text-muted-foreground">No jobs.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
