import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRoles, listPermissions, upsertRole, deleteRole } from "@/lib/core.functions";
import { useActiveCompany } from "./app";
import { PageHeader } from "@/components/core/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings/roles")({
  component: RolesPage,
});

type Role = { id: string; key: string; name: string; description: string | null; isSystem: boolean; permissions: string[] };

function RolesPage() {
  const active = useActiveCompany();
  const qc = useQueryClient();
  const fnRoles = useServerFn(listRoles);
  const fnPerms = useServerFn(listPermissions);
  const fnDelete = useServerFn(deleteRole);
  const { data: roles = [] } = useQuery({ queryKey: ["roles", active.id], queryFn: () => fnRoles({ data: { companyId: active.id } }) });
  const { data: perms = [] } = useQuery({ queryKey: ["permissions"], queryFn: () => fnPerms({}) });

  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["roles", active.id] });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Settings"
        title="Roles & Permissions"
        description="System roles are seeded and cannot be edited. Create custom roles to fit your team."
        actions={
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> New role</Button>
        }
      />

      <div className="mt-8 grid gap-3">
        {roles.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" />
                <span className="font-display font-medium">{r.name}</span>
                {r.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
              </div>
              {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {r.permissions.slice(0, 8).map((p: string) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                {r.permissions.length > 8 && <Badge variant="outline" className="text-[10px]">+{r.permissions.length - 8} more</Badge>}
              </div>
            </div>
            {!r.isSystem && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(r as Role)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (!confirm(`Delete role "${r.name}"?`)) return;
                  try { await fnDelete({ data: { companyId: active.id, roleId: r.id } }); toast.success("Deleted"); invalidate(); }
                  catch (e: any) { toast.error(e.message); }
                }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <RoleDialog
        open={!!editing || creating}
        onClose={() => { setEditing(null); setCreating(false); }}
        role={editing}
        permissions={perms}
        companyId={active.id}
        onSaved={() => { invalidate(); setEditing(null); setCreating(false); }}
      />
    </div>
  );
}

function RoleDialog({ open, onClose, role, permissions, companyId, onSaved }: {
  open: boolean; onClose: () => void; role: Role | null;
  permissions: Array<{ key: string; module: string; description: string }>;
  companyId: string; onSaved: () => void;
}) {
  const fn = useServerFn(upsertRole);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [saving, setSaving] = useState(false);

  // reset on open change
  useMemo(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setSelected(new Set(role?.permissions ?? []));
    }
  }, [open, role]);

  const grouped = useMemo(() => {
    const g: Record<string, Array<{ key: string; description: string }>> = {};
    for (const p of permissions) { (g[p.module] ??= []).push({ key: p.key, description: p.description }); }
    return g;
  }, [permissions]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{role ? "Edit role" : "New role"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await fn({ data: { companyId, roleId: role?.id, name, description: description || null, permissionKeys: [...selected] } });
            toast.success("Saved");
            onSaved();
          } catch (err: any) { toast.error(err.message); }
          finally { setSaving(false); }
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-border p-4">
              {Object.entries(grouped).map(([mod, list]) => (
                <div key={mod}>
                  <p className="mb-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">{mod}</p>
                  <div className="space-y-2">
                    {list.map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-start gap-2 text-sm">
                        <Checkbox
                          checked={selected.has(p.key)}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(p.key); else next.delete(p.key);
                            setSelected(next);
                          }}
                        />
                        <span><span className="font-mono text-xs">{p.key}</span> — <span className="text-muted-foreground">{p.description}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save role</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
