import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListSubscriptions, setCompanyPlan } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

const PLANS = ["starter","professional","enterprise","custom"] as const;

export const Route = createFileRoute("/_platform/admin/subscriptions")({ component: Page });

function Page() {
  const fn = useServerFn(adminListSubscriptions);
  const setPlan = useServerFn(setCompanyPlan);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin","subs"], queryFn: () => fn({}) });
  const mut = useMutation({
    mutationFn: (v: { id: string; planKey: (typeof PLANS)[number] }) =>
      setPlan({ data: { companyId: v.id, planKey: v.planKey } }),
    onSuccess: () => { toast.success("Plan updated"); qc.invalidateQueries({ queryKey: ["admin","subs"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const trial = useServerFn(setCompanyPlan);
  const extend = useMutation({
    mutationFn: (v: { id: string; planKey: string }) => trial({ data: { companyId: v.id, planKey: v.planKey as any, extendTrialDays: 30 } }),
    onSuccess: () => { toast.success("Trial extended 30 days"); qc.invalidateQueries({ queryKey: ["admin","subs"] }); },
  });
  const [selected, setSelected] = useState<Record<string, string>>({});

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Subscriptions" description="Company plans (no payments — Milestone 3)." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data ?? []).map((s: any) => {
              const plan = selected[s.id] ?? s.plan_key;
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="font-display font-medium">{s.companies?.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge>{s.plan_key}</Badge>
                      <Badge variant="outline">{s.status}</Badge>
                      {s.trial_ends_at && (
                        <span className="text-xs text-muted-foreground">
                          Trial ends {new Date(s.trial_ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={plan} onValueChange={(v) => setSelected((prev) => ({ ...prev, [s.id]: v }))}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={plan === s.plan_key || mut.isPending}
                      onClick={() => mut.mutate({ id: s.company_id, planKey: plan as any })}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => extend.mutate({ id: s.company_id, planKey: s.plan_key })}>
                      +30d trial
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
