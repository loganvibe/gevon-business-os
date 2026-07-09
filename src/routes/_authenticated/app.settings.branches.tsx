import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBranches, createBranch, archiveBranch, listLookups } from "@/lib/core.functions";
import { useActiveCompany } from "./app";
import { PageHeader } from "@/components/core/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  const active = useActiveCompany();
  const qc = useQueryClient();
  const fn = useServerFn(listBranches);
  const fnCreate = useServerFn(createBranch);
  const fnArchive = useServerFn(archiveBranch);
  const fnLookups = useServerFn(listLookups);
  const { data = [] } = useQuery({ queryKey: ["branches", active.id], queryFn: () => fn({ data: { companyId: active.id } }) });
  const { data: lookups } = useQuery({ queryKey: ["lookups"], queryFn: () => fnLookups({}) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["branches", active.id] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", country: "", currency: "", timezone: "", isHQ: false });
  const [saving, setSaving] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Settings"
        title="Branches"
        description="Physical or logical locations for this company."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New branch</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New branch</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await fnCreate({ data: {
                    companyId: active.id, name: form.name, code: form.code || null,
                    countryCode: form.country || null, currencyCode: form.currency || null,
                    timezone: form.timezone || null, isHeadquarters: form.isHQ,
                  } });
                  toast.success("Branch created");
                  invalidate();
                  setOpen(false);
                  setForm({ name: "", code: "", country: "", currency: "", timezone: "", isHQ: false });
                } catch (err: any) { toast.error(err.message); }
                finally { setSaving(false); }
              }}>
                <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="LAG-01" /></div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{(lookups?.countries ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{(lookups?.currencies ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="max-h-72">{(lookups?.timezones ?? []).map((c: any) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.isHQ} onCheckedChange={(v) => setForm({ ...form, isHQ: !!v })} />
                  Mark as headquarters (replaces the current HQ)
                </label>
                <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mt-8 overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {b.name}
                    {b.is_headquarters && <Badge variant="outline" className="text-brand">HQ</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.code ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[b.country_code, b.timezone].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell><Badge variant={b.status === "active" ? "default" : "outline"}>{b.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {b.status === "active" && !b.is_headquarters && (
                    <Button variant="ghost" size="sm" onClick={async () => {
                      try { await fnArchive({ data: { companyId: active.id, branchId: b.id } }); invalidate(); }
                      catch (e: any) { toast.error(e.message); }
                    }}>Archive</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
