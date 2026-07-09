import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/core.functions";
import { useActiveCompany } from "./app";
import { PageHeader } from "@/components/core/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/settings/audit")({
  component: AuditPage,
});

function AuditPage() {
  const active = useActiveCompany();
  const fn = useServerFn(listAuditLog);
  const { data = [] } = useQuery({ queryKey: ["audit", active.id], queryFn: () => fn({ data: { companyId: active.id, limit: 100, offset: 0 } }) });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader eyebrow="Settings" title="Audit Log" description="Every privileged action in this company. Append-only." />
      <div className="mt-8 overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No activity yet.</TableCell></TableRow>
            )}
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{r.actor?.name ?? (r.actor?.id?.slice(0, 8) + "…") ?? "System"}</TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-[10px]">{r.action}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.entityType} {r.entityId?.slice(0, 8) ?? ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
