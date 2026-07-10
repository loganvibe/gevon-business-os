import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAvailableModules, enableModule, disableModule } from "@/platform/customer.functions";
import { useActiveCompany } from "@/routes/_authenticated/app";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings/modules")({ component: Page });

function Page() {
  const company = useActiveCompany();
  const list = useServerFn(listAvailableModules);
  const enable = useServerFn(enableModule);
  const disable = useServerFn(disableModule);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["modules","available", company.id],
    queryFn: () => list({ data: { companyId: company.id } }),
  });

  const mut = useMutation({
    mutationFn: async (v: { moduleId: string; on: boolean }) =>
      v.on ? enable({ data: { companyId: company.id, moduleId: v.moduleId } })
           : disable({ data: { companyId: company.id, moduleId: v.moduleId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      qc.invalidateQueries({ queryKey: ["nav"] });
      toast.success("Module updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader
        eyebrow="Settings"
        title="Modules"
        description="Enable only the modules your business needs. Disabled modules disappear from navigation."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((m: any) => (
          <Card key={m.id} className={m.enabled ? "border-brand/40" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-medium">{m.name}</span>
                    {m.is_core && <Badge className="bg-brand/20 text-brand">Core</Badge>}
                    {!m.inPlan && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />{m.subscription_tier}</Badge>}
                    {m.enabled && <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Enabled</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
                  {m.manifest?.dependencies?.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">Requires: {m.manifest.dependencies.join(", ")}</p>
                  ) : null}
                </div>
                <div>
                  {m.is_core ? (
                    <Badge variant="secondary">Always on</Badge>
                  ) : m.enabled ? (
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ moduleId: m.id, on: false })} disabled={mut.isPending}>
                      Disable
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => mut.mutate({ moduleId: m.id, on: true })} disabled={!m.inPlan || mut.isPending}>
                      {m.inPlan ? "Enable" : "Upgrade required"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length ?? 0) === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No modules available yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
