import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAllCompanies, setCompanyStatus } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/admin/companies")({ component: Page });

function Page() {
  const fn = useServerFn(listAllCompanies);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin","companies", search],
    queryFn: () => fn({ data: { search: search || undefined } }),
  });
  const setStatus = useServerFn(setCompanyStatus);
  const mut = useMutation({
    mutationFn: (v: { id: string; status: "active"|"suspended"|"archived" }) =>
      setStatus({ data: { companyId: v.id, status: v.status } }),
    onSuccess: () => { toast.success("Company updated"); qc.invalidateQueries({ queryKey: ["admin","companies"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Companies" description="Every customer company on Gevon." />
      <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data ?? []).map((c: any) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-medium">{c.name}</span>
                    <Badge variant="outline">{c.currency_code}</Badge>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    {c.is_internal && <Badge className="bg-brand/20 text-brand">Internal</Badge>}
                    {c.subscriptions?.[0] && (
                      <Badge variant="outline">
                        {c.subscriptions[0].plan_key} · {c.subscriptions[0].status}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">/{c.slug} · {c.country_code}</div>
                </div>
                <div className="flex gap-2">
                  {c.status !== "active" && (
                    <Button size="sm" variant="outline"
                      onClick={() => mut.mutate({ id: c.id, status: "active" })}>Reactivate</Button>
                  )}
                  {c.status !== "suspended" && (
                    <Button size="sm" variant="outline"
                      onClick={() => mut.mutate({ id: c.id, status: "suspended" })}>Suspend</Button>
                  )}
                  {c.status !== "archived" && (
                    <Button size="sm" variant="ghost"
                      onClick={() => mut.mutate({ id: c.id, status: "archived" })}>Archive</Button>
                  )}
                </div>
              </div>
            ))}
            {(data?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No companies yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
