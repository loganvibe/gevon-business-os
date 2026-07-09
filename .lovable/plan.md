
# Milestone 1 — Gevon Core: Identity & Tenancy

Foundation every future module of Gevon BusinessOS plugs into. Nothing business-facing ships in M1 — this is the multi-tenant substrate, auth, RBAC, RLS, and audit spine.

## 1. Requirements

**In scope**
- Email/password + Google sign-in (Lovable Cloud managed).
- Multi-company (tenant) and multi-branch org model. One user ∈ many companies, with per-company roles.
- RBAC: roles + granular permissions, seeded system roles, custom roles per company.
- Row Level Security on every tenant-scoped table.
- Audit log for every privileged mutation.
- Company Settings shell (name, country, currency, timezone, locale, fiscal year) — values sourced from lookup tables, nothing hardcoded.
- Auth UI: sign-in, sign-up, forgot/reset password, email confirmation, company-switcher.
- Owner-only admin surfaces: Users, Roles, Branches, Settings, Audit Log viewer.

**Out of scope (later milestones)**
- Business modules (CRM, Inventory, Sales, POS, …).
- Feature-flag & Plugin loader (M2).
- Billing (M3).
- AI Copilot (M4+).

**Non-functional**
- Multi-tenant isolation verifiable by test.
- All schema/data changes via migrations.
- No secrets in client bundle.
- Every route has error + not-found boundaries; every mutation is audited.

## 2. Architecture

```text
┌─────────────────────── Browser (TanStack Start SPA + SSR) ─────────────────────┐
│  Public routes                 Auth routes              _authenticated/*       │
│  /  /pricing  /legal/*         /auth  /reset-password   /app/*  (gated)        │
│                                                                                │
│  Supabase JS client (publishable key, RLS as user)                             │
│  Router context: { queryClient, session, activeCompanyId }                     │
└──────────────┬──────────────────────────────────┬──────────────────────────────┘
               │ createServerFn (RPC, bearer)     │ server routes /api/public/*
               ▼                                  ▼
┌─────────────────────── TanStack server runtime (Workers) ──────────────────────┐
│  requireSupabaseAuth middleware  → context.supabase (RLS as user)              │
│  requireCompanyMember middleware → asserts membership + loads role/perms       │
│  Server-only helpers (*.server.ts): admin ops via supabaseAdmin (import inside │
│  handlers only), audit writer, permission resolver, invite tokens              │
└──────────────┬─────────────────────────────────────────────────────────────────┘
               ▼
┌────────────────── Lovable Cloud (Postgres + Auth + Storage) ───────────────────┐
│  Schemas: public (app data) | private (helpers) | audit (logs)                 │
│  RLS everywhere. SECURITY DEFINER helpers for perm checks (no recursion).      │
│  Triggers: profile-on-signup, updated_at, audit capture.                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

Principles: API-first (every UI action calls a typed server fn), modular (each domain in its own folder), configurable (countries/currencies/roles are rows, not code), least privilege (admin client only inside handlers after role check).

## 3. Folder Structure

```text
src/
  routes/
    __root.tsx
    index.tsx                        # marketing landing
    pricing.tsx
    legal.tos.tsx  legal.privacy.tsx
    auth.tsx                         # sign-in/up (combined, next-preserving)
    reset-password.tsx
    _authenticated/
      route.tsx                      # integration-managed gate
      app.tsx                        # app shell (sidebar + company switcher)
      app.index.tsx                  # placeholder dashboard
      app.settings.tsx               # company settings
      app.settings.users.tsx
      app.settings.roles.tsx
      app.settings.branches.tsx
      app.settings.audit.tsx
      app.accept-invite.$token.tsx
  components/
    core/{AppShell, CompanySwitcher, PermissionGate, DataTable, PageHeader}
    auth/{SignInForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm}
    settings/{UsersTable, InviteUserDialog, RolesEditor, BranchesTable, AuditLogTable}
    ui/                              # shadcn primitives
  lib/
    auth/{auth.functions.ts, invites.functions.ts}
    companies/{companies.functions.ts, branches.functions.ts, members.functions.ts}
    rbac/{roles.functions.ts, permissions.ts}
    audit/{audit.functions.ts, audit.server.ts}
    settings/{settings.functions.ts, lookups.functions.ts}
    hooks/{useSession.ts, useActiveCompany.ts, usePermission.ts}
  integrations/supabase/            # generated + auth-middleware (managed)
supabase/migrations/                # all schema changes
```

## 4. Database Design

Naming: snake_case, plural tables, `id uuid pk default gen_random_uuid()`, `created_at`/`updated_at timestamptz`, FKs `on delete` chosen per relation.

**Lookup tables (seeded, extensible)**
- `countries(code pk, name, dial_code, default_currency)`
- `currencies(code pk, name, symbol, decimals)`
- `locales(code pk, name)`
- `timezones(name pk)`

**Identity & tenancy**
- `profiles(id uuid pk → auth.users, full_name, avatar_url, default_company_id, locale)`
- `companies(id, name, slug unique, country_code → countries, currency_code → currencies, timezone → timezones, locale → locales, fiscal_year_start_month int, status, created_by → auth.users)`
- `branches(id, company_id → companies on delete cascade, name, code, country_code, currency_code, timezone, is_headquarters bool, status)`
- `company_members(id, company_id, user_id → auth.users, status enum[active,invited,disabled], invited_by, joined_at, unique(company_id, user_id))`
- `company_invites(id, company_id, email, role_id, token_hash, expires_at, accepted_at, invited_by)`

**RBAC**
- `permissions(key pk text, module text, description)` — e.g. `settings.users.manage`, `branches.write`, `audit.read`.
- `roles(id, company_id nullable, key text, name, description, is_system bool, unique(company_id, key))` — `company_id null` = system role template.
- `role_permissions(role_id, permission_key, pk(role_id, permission_key))`
- `member_roles(member_id → company_members, role_id → roles, pk(member_id, role_id))` — user has N roles per company.

Seeded system roles: `owner` (all perms, auto-assigned to creator, undeletable), `admin`, `manager`, `staff`, `viewer`.

**Audit**
- `audit.audit_logs(id, company_id, actor_user_id, action text, entity_type text, entity_id uuid, before jsonb, after jsonb, ip inet, user_agent text, created_at)` — append-only, no update/delete policies.

**Security-definer helpers (avoid RLS recursion)**
- `private.is_company_member(_company uuid) returns boolean`
- `private.has_permission(_company uuid, _perm text) returns boolean`
- `private.current_company_ids() returns setof uuid`

**RLS pattern** (applied to every tenant table)
```sql
alter table public.branches enable row level security;
create policy branches_select on public.branches for select to authenticated
  using (private.is_company_member(company_id));
create policy branches_write on public.branches for all to authenticated
  using (private.has_permission(company_id, 'branches.write'))
  with check (private.has_permission(company_id, 'branches.write'));
```
Every `CREATE TABLE public.*` migration includes `GRANT` to `authenticated` + `service_role` before `ENABLE RLS` (per platform rule).

**Triggers**
- `handle_new_user()` → creates `profiles` row on `auth.users` insert.
- `handle_new_company()` → inserts creator into `company_members` + assigns `owner` role + creates default HQ branch.
- `set_updated_at()` on every table with `updated_at`.
- `audit_capture()` on privileged tables (branches, members, roles, settings) writes to `audit.audit_logs`.

## 5. API Design (server functions)

All app-internal calls go through `createServerFn` under `src/lib/**/*.functions.ts`. Every mutation validates input with Zod, checks permission via `requireCompanyMember({ perm })`, and audits on success.

```text
auth.signUp / signIn / signOut / requestPasswordReset / updatePassword
companies.create / list (mine) / get / update / archive
companies.switchActive({ companyId })
branches.list / create / update / archive
members.list / invite / resendInvite / revokeInvite / updateRoles / disable / reactivate
invites.accept({ token })
roles.list / create / update / delete / setPermissions
permissions.listCatalog
settings.get / update
audit.list({ filters, page })
lookups.countries / currencies / timezones / locales
```

Server routes (raw HTTP) — none in M1. Webhooks/public APIs deferred.

## 6. UI/UX

**Design system (proposed default; adjustable next turn)** — no purple; distinctly African-fintech, confident and calm.

- Palette (light + dark, all oklch tokens in `src/styles.css`):
  - Primary: deep emerald `oklch(0.52 0.13 158)` (Gevon green)
  - Accent: warm amber `oklch(0.78 0.14 75)`
  - Surfaces: `#0B0F0D` dark / `#FBFAF7` light
  - Semantic: success/warning/destructive/info as tokens
- Type: **Space Grotesk** headings, **Inter** body (via `@fontsource`).
- Radius scale, elevation, motion tokens all in `@theme`.
- Component variants (hero, glass-card, data-table, permission-locked) defined on shadcn primitives — no ad-hoc `className` colors.

**Screens**
- Public: landing, pricing, legal — real Gevon copy, real metadata per route.
- Auth: single `/auth` with tabs (sign in / create account), Google button, next-preserving, `/reset-password` public.
- App shell: left sidebar (Dashboard, Settings), top bar with **company switcher**, user menu, breadcrumbs.
- Dashboard: welcome placeholder + "modules coming" grid (populated in later milestones).
- Settings → Users: invite by email + role, table with status/role chips, revoke/disable.
- Settings → Roles: role list + permission matrix editor (grouped by module).
- Settings → Branches: CRUD, mark HQ.
- Settings → Company: name/country/currency/timezone/locale/fiscal year (all from lookups).
- Settings → Audit: filterable, paginated, read-only.
- `<PermissionGate perm="…">` hides controls the user can't use; server re-checks.

## 7. Business Rules

- A user signing up with no company sees a "Create your company" onboarding.
- Company creator is auto-`owner`; `owner` role is undeletable and always retains all permissions.
- A company must always have ≥1 active owner and ≥1 HQ branch.
- Invites expire in 7 days; token stored hashed; email delivered via Lovable Email (deferred to when Email is enabled — until then, invite link is shown to the inviter).
- Disabling a member revokes access immediately (RLS driven by `status='active'` check inside helpers).
- Country change updates default currency suggestion but never silently overwrites existing currency.
- All timestamps stored UTC; rendered in company timezone.
- Deleting a company is soft (`status='archived'`); hard delete is a separate admin-only operation (post-M1).

## 8. Security Design

- **AuthN**: Supabase Auth (email + Google). Passwords: HIBP check enabled via `configure_auth`.
- **AuthZ**: RBAC via `member_roles` → `role_permissions` → `permissions`. Server-side `requireCompanyMember({ perm })` middleware is the single source of truth; UI gates are cosmetic.
- **Tenant isolation**: RLS on every `public.*` table using SECURITY DEFINER helpers in `private` schema (prevents recursion). No cross-company read paths.
- **Least-privilege server**: `supabaseAdmin` only inside `.handler()` bodies via `await import(...)`, only after role check; used solely for Auth Admin (invites), never as default data client.
- **Secrets**: all server-only env; no `VITE_` service key. Managed by Lovable Cloud.
- **Audit**: every privileged mutation writes `audit.audit_logs`; table is append-only (no update/delete policy).
- **Rate limiting**: per-user + per-IP token bucket on invite/reset endpoints (in-memory KV via Workers cache; upgrade path noted).
- **Transport**: HTTPS only (managed). CSRF N/A (same-origin RPC with bearer). XSS: React auto-escape + strict CSP link tags in `__root.tsx`.
- **PII**: emails only in `auth.users` + invites; profiles hold display data.
- **Sign-out hygiene**: cancel queries → clear cache → `signOut` → replace-navigate to `/auth`.

## 9. Testing Strategy

- **Unit**: permission resolver, role assignment invariants (owner cannot be removed if last), invite token hashing/expiry.
- **Integration (Vitest + supabase-js against local schema)**: RLS matrix — for each (role × table × op), assert allow/deny; cross-tenant read attempts must return zero rows.
- **E2E (Playwright, headless)**: sign-up → create company → invite second user → accept invite → switch companies → attempt forbidden action → observe audit entry.
- **Migration tests**: forward + idempotent re-run.
- **Manual QA checklist** shipped in `docs/qa/m1.md`.

## 10. Delivery Plan (implementation order once approved)

1. Design system + brand tokens + landing/pricing/legal shells.
2. Migrations: lookups, profiles, companies, branches, members, roles, permissions, invites, audit; helpers; triggers; RLS; seeds.
3. Auth pages + managed `_authenticated` layout + Google sign-in via `lovable.auth`.
4. Server-fn layer + `requireCompanyMember` middleware + audit writer.
5. App shell + company switcher + Settings screens (Company, Branches, Users, Roles, Audit).
6. Tests (RLS matrix + one E2E happy path) + `configure_auth` (HIBP) + `configure_social_auth` (Google).
7. Docs: `docs/architecture.md`, `docs/rbac.md`, `docs/qa/m1.md`.

---

**Awaiting approval.** On approval I'll execute steps 1–7 in order and stop at the M1 exit criteria: a signed-in user can create a company, invite a teammate, assign roles, edit settings, and every action appears in the audit log — with the RLS matrix green.

If you want me to tweak the brand direction (colors/fonts/tone) or swap Milestone 1 for the larger "Identity + Module Loader + Feature Flags" slice, say so before I start.
