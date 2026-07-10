import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListFlags, setFlagOverride, deleteFlagOverride } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUSES = ["development","internal","beta","premium","public","disabled"] as const;

export const Route = createFileRoute("/_platform/admin/feature-flags")({ component: Page });

function Page() {
  const list = useServerFn(adminListFlags);
  const setOv = useServerFn(setFlagOverride);
  const delOv = useServerFn(deleteFlagOverride);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin","flags"], queryFn: () => list({}) });

  const mut = useMutation({
    mutationFn: (v: { flagKey: string; status: (typeof STATUSES)[number] }) =>
      setOv({ data: { flagKey: v.flagKey, companyId: null, status: v.status } }),
    onSuccess: () => { toast.success("Global override set"); qc.invalidateQueries({ queryKey: ["admin","flags"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delOv({ data: { id } }),
    onSuccess: () => { toast.success("Override cleared"); qc.invalidateQueries({ queryKey: ["admin","flags"] }); },
  });

  const globalOvs = new Map<string, any>();
  for (const o of data?.overrides ?? []) if (o.company_id === null) globalOvs.set(o.flag_key, o);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Feature Flags" description="Global overrides. Company overrides are set from the customer portal." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data?.flags ?? []).map((f: any) => {
              const ov = globalOvs.get(f.key);
              const effective = ov?.status ?? f.default_status;
              return (
                <div key={f.key} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-medium">{f.name}</span>
                      <Badge variant="outline">{f.key}</Badge>
                      {f.module_id && <Badge variant="secondary">{f.module_id}</Badge>}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Default: <code>{f.default_status}</code> · Effective:{" "}
                      <StatusPill status={effective} />
                      {ov && <span className="ml-2 text-xs">(global override)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={effective} onValueChange={(v) => mut.mutate({ flagKey: f.key, status: v as any })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {ov && (
                      <Button size="sm" variant="ghost" onClick={() => del.mutate(ov.id)}>Clear</Button>
                    )}
                  </div>
                </div>
              );
            })}
            {(data?.flags?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No feature flags yet. Sync module manifests to seed flags.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    disabled: "bg-destructive/15 text-destructive",
    development: "bg-purple-500/15 text-purple-500",
    internal: "bg-amber-500/15 text-amber-500",
    beta: "bg-blue-500/15 text-blue-500",
    premium: "bg-brand/15 text-brand",
    public: "bg-emerald-500/15 text-emerald-500",
  };
  return <code className={`rounded px-2 py-0.5 text-xs ${map[status] ?? ""}`}>{status}</code>;
}
