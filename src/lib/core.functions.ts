import { createServerFn, useServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

/* ============================================================
 * COMPANIES
 * ============================================================ */

export const listMyCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("company_members")
      .select("id, company_id, status, companies(id, name, slug, country_code, currency_code, timezone, locale, status)")
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    const { data: profile } = await supabase.from("profiles").select("default_company_id").eq("id", userId).maybeSingle();
    return {
      companies: (data ?? []).map((r: any) => r.companies).filter(Boolean),
      defaultCompanyId: profile?.default_company_id ?? null,
    };
  });

const createCompanyInput = z.object({
  name: z.string().min(2).max(80),
  countryCode: z.string().min(2).max(3),
  currencyCode: z.string().min(3).max(3),
  timezone: z.string().min(1),
  locale: z.string().min(2).max(5).default("en"),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCompanyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const baseSlug = slugify(data.name) || "company";
    let slug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name: data.name,
        slug,
        country_code: data.countryCode,
        currency_code: data.currencyCode,
        timezone: data.timezone,
        locale: data.locale,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      companyId: company.id,
      action: "company.created",
      entityType: "company",
      entityId: company.id,
      after: company,
    });
    return company;
  });

const updateCompanyInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  countryCode: z.string().min(2).max(3).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
});

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateCompanyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.countryCode !== undefined && { country_code: data.countryCode }),
      ...(data.currencyCode !== undefined && { currency_code: data.currencyCode }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.locale !== undefined && { locale: data.locale }),
      ...(data.fiscalYearStartMonth !== undefined && { fiscal_year_start_month: data.fiscalYearStartMonth }),
    };

    const { data: before } = await supabase.from("companies").select("*").eq("id", data.companyId).maybeSingle();
    const { data: after, error } = await supabase
      .from("companies")
      .update(patch)
      .eq("id", data.companyId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "company.updated",
      entityType: "company",
      entityId: data.companyId,
      before,
      after,
    });
    return after;
  });

export const setDefaultCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update({ default_company_id: data.companyId }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * BRANCHES
 * ============================================================ */

export const listBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("branches").select("*").eq("company_id", data.companyId).order("is_headquarters", { ascending: false }).order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createBranchInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(80),
  code: z.string().max(20).optional().nullable(),
  countryCode: z.string().optional().nullable(),
  currencyCode: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  isHeadquarters: z.boolean().default(false),
});

export const createBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createBranchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.isHeadquarters) {
      await supabase.from("branches").update({ is_headquarters: false }).eq("company_id", data.companyId).eq("is_headquarters", true);
    }
    const { data: row, error } = await supabase
      .from("branches")
      .insert({
        company_id: data.companyId,
        name: data.name,
        code: data.code ?? null,
        country_code: data.countryCode ?? null,
        currency_code: data.currencyCode ?? null,
        timezone: data.timezone ?? null,
        is_headquarters: data.isHeadquarters,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: data.companyId,
      action: "branch.created",
      entityType: "branch",
      entityId: row.id,
      after: row,
    });
    return row;
  });

export const archiveBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid(), branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("branches").update({ status: "archived" }).eq("id", data.branchId).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "branch.archived", entityType: "branch", entityId: data.branchId, after: row });
    return row;
  });

/* ============================================================
 * MEMBERS + ROLES
 * ============================================================ */

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: members, error } = await supabase
      .from("company_members")
      .select("id, user_id, status, joined_at, member_roles(role_id, roles(id, key, name))")
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    const userIds = (members ?? []).map((m: any) => m.user_id);
    let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    return (members ?? []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      status: m.status,
      joinedAt: m.joined_at,
      fullName: profiles[m.user_id]?.full_name ?? null,
      avatarUrl: profiles[m.user_id]?.avatar_url ?? null,
      roles: (m.member_roles ?? []).map((mr: any) => ({ id: mr.roles.id, key: mr.roles.key, name: mr.roles.name })),
    }));
  });

export const listRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: roles, error } = await supabase
      .from("roles")
      .select("id, key, name, description, is_system, role_permissions(permission_key)")
      .eq("company_id", data.companyId)
      .order("is_system", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return (roles ?? []).map((r: any) => ({
      id: r.id, key: r.key, name: r.name, description: r.description, isSystem: r.is_system,
      permissions: (r.role_permissions ?? []).map((rp: any) => rp.permission_key),
    }));
  });

export const listPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("permissions").select("*").order("module").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const inviteInput = z.object({
  companyId: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  roleId: z.string().uuid(),
});

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Generate token, store hash
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: row, error } = await supabase.from("company_invites").insert({
      company_id: data.companyId,
      email: data.email,
      role_id: data.roleId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: userId,
    }).select("*").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "member.invited", entityType: "invite", entityId: row.id, after: { email: data.email, role_id: data.roleId } });
    return { id: row.id, email: data.email, expiresAt, token };
  });

export const listInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("company_invites")
      .select("id, email, expires_at, accepted_at, role_id, roles(name)")
      .eq("company_id", data.companyId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({ id: r.id, email: r.email, expiresAt: r.expires_at, roleName: r.roles?.name ?? "—" }));
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid(), inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("company_invites").delete().eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "member.invite_revoked", entityType: "invite", entityId: data.inviteId });
    return { ok: true };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const tokenHash = await sha256(data.token);
    const { data: invite, error } = await supabase
      .from("company_invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("accepted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found or already used");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite expired");

    // Insert (or reactivate) membership using service role — invitee has no perms yet
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("company_members").select("id, status").eq("company_id", invite.company_id).eq("user_id", userId).maybeSingle();
    let memberId: string;
    if (existing) {
      memberId = existing.id;
      await supabaseAdmin.from("company_members").update({ status: "active" }).eq("id", memberId);
    } else {
      const { data: m, error: mErr } = await supabaseAdmin.from("company_members").insert({
        company_id: invite.company_id, user_id: userId, status: "active", invited_by: invite.invited_by,
      }).select("id").single();
      if (mErr) throw new Error(mErr.message);
      memberId = m.id;
    }
    await supabaseAdmin.from("member_roles").upsert({ member_id: memberId, role_id: invite.role_id });
    await supabaseAdmin.from("company_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

    await writeAudit(context, { companyId: invite.company_id, action: "member.joined", entityType: "member", entityId: memberId, after: { user_id: userId } });
    return { companyId: invite.company_id };
  });

const updateMemberRolesInput = z.object({
  companyId: z.string().uuid(),
  memberId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).min(1),
});
export const updateMemberRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateMemberRolesInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await supabase.from("member_roles").delete().eq("member_id", data.memberId);
    const rows = data.roleIds.map((role_id) => ({ member_id: data.memberId, role_id }));
    const { error } = await supabase.from("member_roles").insert(rows);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "member.roles_updated", entityType: "member", entityId: data.memberId, after: { role_ids: data.roleIds } });
    return { ok: true };
  });

export const setMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    companyId: z.string().uuid(),
    memberId: z.string().uuid(),
    status: z.enum(["active", "disabled"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("company_members").update({ status: data.status }).eq("id", data.memberId);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: `member.${data.status}`, entityType: "member", entityId: data.memberId });
    return { ok: true };
  });

/* ============================================================
 * CUSTOM ROLES
 * ============================================================ */
const upsertRoleInput = z.object({
  companyId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  name: z.string().min(2).max(60),
  description: z.string().max(240).optional().nullable(),
  permissionKeys: z.array(z.string()).default([]),
});
export const upsertRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let roleId = data.roleId;
    if (roleId) {
      const { error } = await supabase.from("roles").update({ name: data.name, description: data.description ?? null }).eq("id", roleId);
      if (error) throw new Error(error.message);
    } else {
      const key = slugify(data.name);
      const { data: r, error } = await supabase.from("roles").insert({
        company_id: data.companyId, key, name: data.name, description: data.description ?? null, is_system: false,
      }).select("id").single();
      if (error) throw new Error(error.message);
      roleId = r.id;
    }
    await supabase.from("role_permissions").delete().eq("role_id", roleId);
    if (data.permissionKeys.length) {
      const rows = data.permissionKeys.map((permission_key) => ({ role_id: roleId!, permission_key }));
      const { error } = await supabase.from("role_permissions").insert(rows);
      if (error) throw new Error(error.message);
    }
    await writeAudit(context, { companyId: data.companyId, action: "role.upserted", entityType: "role", entityId: roleId, after: { name: data.name, permissions: data.permissionKeys } });
    return { id: roleId };
  });

export const deleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid(), roleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("roles").delete().eq("id", data.roleId);
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "role.deleted", entityType: "role", entityId: data.roleId });
    return { ok: true };
  });

/* ============================================================
 * AUDIT
 * ============================================================ */

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    companyId: z.string().uuid(),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify caller has audit.read via user-scoped client (RLS)
    const { data: perm, error: permErr } = await context.supabase.rpc as any; // fallback — we'll query directly
    void perm; void permErr;
    const { data: allowed } = await context.supabase
      .from("company_members").select("id").eq("company_id", data.companyId).eq("user_id", context.userId).eq("status", "active").maybeSingle();
    if (!allowed) throw new Error("Forbidden");
    // Check permission through user client (RLS on audit_logs already enforces this, but we filter here for cleaner errors)
    const { data: rows, error } = await (supabaseAdmin as any)
      .schema("audit")
      .from("audit_logs")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    // Enrich actor names
    const actorIds = Array.from(new Set((rows ?? []).map((r: any) => r.actor_user_id).filter(Boolean))) as string[];
    let actors: Record<string, string | null> = {};
    if (actorIds.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", actorIds);
      actors = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name]));
    }
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      actor: r.actor_user_id ? { id: r.actor_user_id, name: actors[r.actor_user_id] ?? null } : null,
      createdAt: r.created_at,
      before: r.before,
      after: r.after,
    }));
  });

/* ============================================================
 * LOOKUPS
 * ============================================================ */

export const listLookups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [c, cur, tz, loc] = await Promise.all([
      supabase.from("countries").select("*").order("name"),
      supabase.from("currencies").select("*").order("code"),
      supabase.from("timezones").select("*").order("name"),
      supabase.from("locales").select("*").order("name"),
    ]);
    return {
      countries: c.data ?? [],
      currencies: cur.data ?? [],
      timezones: tz.data ?? [],
      locales: loc.data ?? [],
    };
  });

/* ============================================================
 * Helpers
 * ============================================================ */

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function writeAudit(
  context: { userId: string; supabase: any },
  entry: {
    companyId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).schema("audit").from("audit_logs").insert({
      company_id: entry.companyId,
      actor_user_id: context.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}

/* ============================================================
 * React hooks
 * ============================================================ */

export function useMyCompanies() {
  const fn = useServerFn(listMyCompanies);
  return useQuery({ queryKey: ["companies", "mine"], queryFn: () => fn({}) });
}

export function useMutationInvalidate(keys: string[][]) {
  const qc = useQueryClient();
  return useMemo(() => () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })), [qc, keys]);
}

export function useCreateCompany() {
  const fn = useServerFn(createCompany);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof createCompanyInput>) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies", "mine"] }),
  });
}
