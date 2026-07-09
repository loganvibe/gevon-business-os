import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMembers, listRoles, listInvites, inviteMember, revokeInvite, setMemberStatus, updateMemberRoles } from "@/lib/core.functions";
import { useActiveCompany } from "./app";
import { PageHeader } from "@/components/core/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Copy, Ban, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings/users")({
  component: UsersPage,
});

function UsersPage() {
  const active = useActiveCompany();
  const qc = useQueryClient();
  const fnMembers = useServerFn(listMembers);
  const fnRoles = useServerFn(listRoles);
  const fnInvites = useServerFn(listInvites);
  const fnStatus = useServerFn(setMemberStatus);
  const fnUpdateRoles = useServerFn(updateMemberRoles);
  const fnRevoke = useServerFn(revokeInvite);

  const { data: members = [] } = useQuery({ queryKey: ["members", active.id], queryFn: () => fnMembers({ data: { companyId: active.id } }) });
  const { data: roles = [] } = useQuery({ queryKey: ["roles", active.id], queryFn: () => fnRoles({ data: { companyId: active.id } }) });
  const { data: invites = [] } = useQuery({ queryKey: ["invites", active.id], queryFn: () => fnInvites({ data: { companyId: active.id } }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["members", active.id] });
    qc.invalidateQueries({ queryKey: ["invites", active.id] });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Settings"
        title="Team"
        description="Invite people, assign roles, disable or reactivate access."
        actions={<InviteDialog roles={roles} companyId={active.id} onDone={invalidate} />}
      />

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Members</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.fullName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{m.userId.slice(0, 8)}…</div>
                  </TableCell>
                  <TableCell>
                    <RoleEditor
                      member={m}
                      roles={roles}
                      onSave={async (roleIds) => {
                        try { await fnUpdateRoles({ data: { companyId: active.id, memberId: m.id, roleIds } }); toast.success("Roles updated"); invalidate(); }
                        catch (e: any) { toast.error(e.message); }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "outline"}>{m.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.status === "active" ? (
                      <Button variant="ghost" size="sm" onClick={async () => {
                        try { await fnStatus({ data: { companyId: active.id, memberId: m.id, status: "disabled" } }); invalidate(); }
                        catch (e: any) { toast.error(e.message); }
                      }}>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Disable
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={async () => {
                        try { await fnStatus({ data: { companyId: active.id, memberId: m.id, status: "active" } }); invalidate(); }
                        catch (e: any) { toast.error(e.message); }
                      }}>
                        <Undo2 className="mr-1 h-3.5 w-3.5" /> Reactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {invites.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Pending invites</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>{i.roleName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(i.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={async () => {
                        try { await fnRevoke({ data: { companyId: active.id, inviteId: i.id } }); toast.success("Invite revoked"); invalidate(); }
                        catch (e: any) { toast.error(e.message); }
                      }}>Revoke</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}

function InviteDialog({ roles, companyId, onDone }: { roles: Array<{ id: string; name: string }>; companyId: string; onDone: () => void }) {
  const fnInvite = useServerFn(inviteMember);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEmail(""); setInviteLink(null); } }}>
      <DialogTrigger asChild>
        <Button><UserPlus className="mr-2 h-4 w-4" /> Invite person</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a teammate</DialogTitle></DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite created. Send this link to <strong>{email}</strong> — it expires in 7 days.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={inviteLink} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            if (!roleId) return toast.error("Choose a role");
            setLoading(true);
            try {
              const res = await fnInvite({ data: { companyId, email, roleId } });
              const url = `${window.location.origin}/app/accept-invite/${res.token}`;
              setInviteLink(url);
              onDone();
            } catch (err: any) { toast.error(err.message); }
            finally { setLoading(false); }
          }}>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.filter((r: any) => r.key !== "owner").map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleEditor({ member, roles, onSave }: {
  member: { roles: Array<{ id: string; name: string; key: string }> };
  roles: Array<{ id: string; name: string; key: string }>;
  onSave: (roleIds: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(member.roles[0]?.id ?? "");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex flex-wrap gap-1 rounded hover:opacity-80">
          {member.roles.length ? member.roles.map((r) => (
            <Badge key={r.id} variant="outline">{r.name}</Badge>
          )) : <Badge variant="outline">No role</Badge>}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Change role</DialogTitle></DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={async () => { if (!selected) return; await onSave([selected]); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
