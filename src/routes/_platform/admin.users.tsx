import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPlatformAdmins, grantPlatformAdmin, revokePlatformAdmin } from "@/platform/admin.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

const ROLES = [
  "super_admin","support","developer","operations","finance","compliance","security","billing",
] as const;

export const Route = createFileRoute("/_platform/admin/users")({ component: Page });

function Page() {
  const list = useServerFn(listPlatformAdmins);
  const grant = useServerFn(grantPlatformAdmin);
  const revoke = useServerFn(revokePlatformAdmin);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin","platform-admins"], queryFn: () => list({}) });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("support");

  const mut = useMutation({
    mutationFn: () => grant({ data: { email, role } }),
    onSuccess: () => { toast.success("Platform admin added"); setEmail(""); qc.invalidateQueries({ queryKey: ["admin","platform-admins"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const rev = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["admin","platform-admins"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Platform Users" description="Gevon Technologies staff with admin access." />

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <div>
            <Label>User email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@gevon.tech" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!email || mut.isPending} onClick={() => mut.mutate()}>Grant access</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-display font-medium">{a.email ?? a.user_id}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge>{a.role.replace("_"," ")}</Badge>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => rev.mutate(a.id)}>Revoke</Button>
              </div>
            ))}
            {(data?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No platform admins yet. Bootstrap the first one directly in the database.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
