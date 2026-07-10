
# Milestone 2 — Gevon Core Platform

Foundation for every future module. No business modules (CRM, HR, Payroll…) are built here — only the substrate they plug into, plus the hard split between Customer Business Portal (`/app/*`) and Gevon Admin Portal (`/admin/*`).

## 1. Requirements

**In scope**
- Portal split: `/app/*` (customers) vs `/admin/*` (Gevon staff). Two isolated permission systems, two isolated route trees, two isolated audit surfaces.
- Module Registry (DB + in-code manifest) — every module self-describes.
- Plugin Loader — Core discovers, validates, mounts modules at runtime (with lazy code-splitting).
- Feature Flag Engine — status enum (dev, internal, beta, premium, public, disabled) + global overrides + per-company overrides + evaluation API.
- Company Module Manager — company enables/disables modules; disabled ⇒ hidden from nav + routes 404.
- Dependency Engine — module A requires B; activation is blocked if deps missing; deactivation blocked if dependents active.
- Dynamic Navigation — sidebar/topbar generated from registry ∩ enabled modules ∩ user permissions ∩ feature flags.
- Licensing Foundation — plans (Starter/Pro/Enterprise/Custom), plan↔module mapping, subscription record per company (no payments yet).
- AI Capability Registry — module contributes AI capabilities; central discovery API (no LLM calls yet).
- Admin Portal shell — Companies, Users (platform admins), Subscriptions, Feature Flags, Module Management, Global Audit, Platform Analytics stubs.
- Platform admin identity — new `platform_admins` table + `platform_role` enum, fully separate from `company_members`.
- Developer Portal architecture (`/developers/*`) — route tree + gate only; no features.

**Out of scope**
- Any business module (CRM, Inventory, Sales, HR, Payroll, Reports).
- Payment/billing integration.
- Real LLM/AI execution.
- Email delivery for invites (still deferred).

**Non-functional**
- Customer users can never reach `/admin/*`; platform admins can never see company data via customer paths.
- 100+ modules supported: registry indexed, nav memoized, routes lazy.
- All DB changes via migrations; RLS + audit maintained on every new table.

## 2. Architecture

```text
┌──────────────────────────── Browser ─────────────────────────────────┐
│  Public: / /pricing /legal/*                                         │
│  Auth:   /auth /reset-password                                       │
│                                                                      │
│  Customer Business Portal        Gevon Admin Portal                  │
│  /_authenticated/app/*           /_platform/admin/*                  │
│  gate: company member            gate: platform_admins row           │
│                                                                      │
│  Developer Portal (skeleton only)                                    │
│  /_platform/developers/*                                             │
└──────────────┬───────────────────────────┬───────────────────────────┘
               │ createServerFn            │ createServerFn
               ▼                           ▼
┌──────── requireCompanyMember ────┐  ┌──── requirePlatformAdmin ─────┐
│ context: supabase (RLS as user), │  │ context: supabase, userId,    │
│ userId, activeCompanyId, perms   │  │ platformRole, perms           │
└──────────────┬───────────────────┘  └───────────────┬───────────────┘
               ▼                                       ▼
┌──────────────────── Module Registry & Plugin Loader ─────────────────┐
│  In-code manifests (src/modules/*/module.ts) → registered at build   │
│  DB mirror (public.modules, module_versions) → source of truth for   │
│  admin toggles, feature flags, licensing, company activations        │
│  Loader: resolves deps → checks flags → checks license → mounts      │
│  routes via lazy React.lazy + injects nav + registers AI caps        │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Folder Structure

```text
src/
  routes/
    _authenticated/            # existing customer gate
      app.*                    # customer portal (unchanged surface)
      app.$moduleSlug.$.tsx    # dynamic module catch-all
    _platform/
      route.tsx                # ssr:false, requires platform_admins row
      admin.tsx                # admin shell
      admin.index.tsx
      admin.companies.tsx
      admin.companies.$id.tsx
      admin.users.tsx
      admin.subscriptions.tsx
      admin.modules.tsx
      admin.feature-flags.tsx
      admin.audit.tsx
      admin.analytics.tsx
      developers.tsx           # skeleton
      developers.index.tsx
  modules/                     # NEW — each module is a folder
    _core/module.ts            # built-in "core" module (settings etc.)
    _example/                  # reference module, disabled by default
      module.ts                # ModuleManifest
      routes/                  # route components
      widgets/
      ai/
      permissions.ts
  platform/
    registry/
      types.ts                 # ModuleManifest, FeatureFlag, License…
      registry.ts              # in-memory registry (built from manifests)
      loader.ts                # resolve deps, filter by flag/license/perm
      nav.ts                   # buildNavigation(user, company)
    flags/
      flags.functions.ts       # evaluate + admin CRUD
      evaluator.ts             # pure eval logic (testable)
    licensing/
      plans.ts                 # Starter/Pro/Enterprise/Custom definitions
      licensing.functions.ts
    modules/
      modules.functions.ts     # company enable/disable, dep checks
      admin.functions.ts       # platform-admin module CRUD
    admin/
      admins.functions.ts      # platform admin CRUD + role checks
    ai/
      capabilities.ts          # AI capability registry
  lib/
    core.functions.ts          # existing
  components/
    platform/{AdminShell, ModuleCard, FlagToggle, LicenseBadge}
    core/{DynamicNav, PermissionGate}   # DynamicNav is NEW
supabase/migrations/           # new migration for M2 tables
tests/
  unit/{flags,deps,registry,nav}.test.ts
  integration/{portal-isolation,module-lifecycle}.test.ts
```

## 4. Database Design

All new `public.*` tables: GRANT to `authenticated` + `service_role`, RLS enabled, policies via `private.*` helpers. Audit trigger where mutations matter.

**Platform identity (isolated from customer RBAC)**
- `platform_role` enum: `super_admin, support, developer, operations, finance, compliance, security, billing`.
- `platform_admins(id, user_id → auth.users unique, role platform_role, status enum[active,disabled], created_by, timestamps)`.
- Helper: `private.is_platform_admin(_uid uuid) returns boolean`, `private.platform_has_role(_uid uuid, _role platform_role)`.

**Module registry**
- `modules(id text pk, name, description, category, icon, version text, subscription_tier text, is_core bool, status enum[active,deprecated,disabled_global], manifest_hash, timestamps)` — mirrors code manifest; seeded on deploy.
- `module_dependencies(module_id, depends_on_id, pk composite)`.
- `module_permissions(module_id, permission_key → permissions.key)` — permissions are auto-inserted from manifest.
- `module_ai_capabilities(id, module_id, key, name, description, input_schema jsonb, output_schema jsonb)`.

**Feature flags**
- `feature_flag_status` enum: `development, internal, beta, premium, public, disabled`.
- `feature_flags(key text pk, module_id nullable, name, description, default_status feature_flag_status, timestamps)`.
- `feature_flag_overrides(id, flag_key → feature_flags, company_id nullable, status feature_flag_status, note, set_by, timestamps, unique(flag_key, company_id))` — `company_id null` = global override.

**Licensing**
- `plans(key pk text, name, description, tier int, is_custom bool)`.
- `plan_modules(plan_key, module_id, pk composite)`.
- `subscriptions(id, company_id unique, plan_key → plans, status enum[trial,active,past_due,cancelled], trial_ends_at, current_period_end, created_by, timestamps)` — no payment fields.

**Company module activation**
- `company_modules(id, company_id, module_id, enabled_at, enabled_by, settings jsonb default '{}', unique(company_id, module_id))`.

**RLS summary**
- `modules`, `plans`, `plan_modules`, `feature_flags`: SELECT to `authenticated` (read-only catalog); writes require `private.is_platform_admin`.
- `feature_flag_overrides`, `subscriptions`, `company_modules`: SELECT via `private.is_company_member(company_id)`; writes require `has_permission(company_id, 'modules.manage')` OR platform admin.
- `platform_admins`: SELECT only to platform admins; writes only to `super_admin`.

**Permissions seeded**
- `modules.manage`, `modules.view`, `flags.override`, `subscription.view`, `subscription.manage`, `platform.admins.manage`, `platform.flags.manage`, `platform.modules.manage`, `platform.audit.read`, `platform.analytics.read`.

## 5. API Design (server functions)

Customer-side (`_authenticated`, requireCompanyMember):
- `modules.listAvailable({ companyId })` → registry filtered by plan + flags + perms.
- `modules.listEnabled({ companyId })`.
- `modules.enable({ companyId, moduleId })` / `modules.disable(...)` — dep-checked, audited.
- `modules.getManifest({ moduleId })`.
- `flags.evaluate({ companyId, keys[] })`.
- `subscription.get({ companyId })`.
- `nav.get({ companyId })` (SSR-safe; delegates to loader).

Platform-side (`_platform`, requirePlatformAdmin):
- `admin.companies.list/search/get/suspend/reactivate`.
- `admin.users.list` (platform admins only) `/ invite / updateRole / disable`.
- `admin.modules.list/upsertFromManifest/setGlobalStatus`.
- `admin.flags.list/create/update/setGlobalOverride/setCompanyOverride/delete`.
- `admin.subscriptions.list/setPlan/extendTrial`.
- `admin.audit.list({ filters })` — reads from existing `audit.audit_logs` across tenants.
- `admin.analytics.summary` — counts only.

All mutations: Zod input, permission middleware, audit write.

## 6. UI/UX

- **Customer app shell** (`/app`): sidebar becomes fully dynamic via `<DynamicNav>` — items come from `nav.get`. Adds Settings → Modules screen (enable/disable per company with dep hints and plan lock badges) and Settings → Subscription (read-only plan + module inclusion).
- **Admin shell** (`/admin`): distinct visual chrome (charcoal top bar + red "Gevon Admin" ribbon so it's never mistaken for a customer surface), sidebar: Companies, Platform Users, Subscriptions, Modules, Feature Flags, Audit, Analytics.
- **Reusable primitives**: `<PermissionGate>` (already exists — reused), `<FlagGate flag="…">`, `<LicenseBadge tier="…">`, `<ModuleCard>`, `<DependencyChip>`, `<FlagStatusPill>`.
- **Access denials**: platform-admin gate redirects non-admins to `/app`; customer paths hide admin links entirely.
- No design-system change — reuses the Gevon emerald tokens shipped in M1.

## 7. Business Rules

- A module cannot be enabled for a company unless: (a) it's in the company's plan, (b) all `module_dependencies` are enabled, (c) required feature flags resolve to non-`disabled` for that company.
- A module cannot be disabled if any enabled module depends on it — surface the dependents.
- `is_core=true` modules cannot be disabled per company (always on).
- Global `flag.status = disabled` overrides everything; `feature_flag_overrides` layered as: company override > global override > flag default.
- `development` flags visible only to platform admins acting as themselves.
- `internal` flags visible only to companies whose plan_key = `custom` and are marked internal (a `companies.is_internal` bool — added).
- `beta` requires opt-in via a per-company override.
- `premium` requires plan tier ≥ `professional`.
- Removing a `platform_admin` requires ≥1 remaining `super_admin` (mirrors owner rule).
- Suspending a company disables all its `company_modules` reads via RLS (subscription.status check inside helpers).

## 8. Security Design

- **Hard portal isolation**: `/admin/*` lives under a separate `_platform` layout with its own gate calling `private.is_platform_admin`. No shared middleware path with `_authenticated`. Customer `requireCompanyMember` middleware rejects if caller is only a platform admin without company membership (and vice versa).
- **Privilege boundaries**: platform admins have zero implicit access to company data — they only see aggregates/metadata; to view a specific company's data an explicit `support_session` (deferred design, table stub only) would be required (audited). M2 exposes only counts + settings, never row data.
- **RLS everywhere**, using `private.*` SECURITY DEFINER helpers (no recursion).
- **Admin actions audited** to `audit.audit_logs` with `entity_type='platform.*'` and `company_id=null` for cross-tenant events.
- **Feature-flag evaluator is server-authoritative**; the client receives only the resolved booleans, never the raw override chain for other companies.
- **Manifest sync**: `admin.modules.upsertFromManifest` is the only path that inserts/updates `modules` rows; hashed to detect drift; runs behind `super_admin` only.
- **Rate limits** carried over from M1 for invite/reset; add on `admin.flags.setCompanyOverride` and `modules.enable`.

## 9. Testing Strategy

- **Unit** (Vitest): `evaluator.ts` (all layering combinations), dependency resolver (cycles, missing deps, dependents), `buildNavigation` (perm × flag × license filtering), plan→module mapping.
- **Integration** (Vitest against DB): platform-admin cannot read `companies.*` rows via customer paths; customer owner cannot call `admin.*` server fns (401/403); module enable respects deps + plan + flags; disable blocked by dependents.
- **Registry tests**: every manifest in `src/modules/*` matches the Zod `ModuleManifest` schema; every permission it declares exists in `permissions` after sync.
- **Portal isolation E2E** (Playwright): sign in as customer → `/admin` → redirected; sign in as platform admin → `/app` unavailable unless also a member → visible admin shell.
- **Regression**: M1 RLS matrix re-run.

## 10. Delivery Plan (once approved)

1. Migration: platform admins, module registry tables, feature flags, licensing, company_modules, seed plans + core module + baseline flags + permissions.
2. `src/platform/registry` + `src/modules/_core/module.ts` + manifest sync server-fn.
3. `requirePlatformAdmin` middleware; `_platform` route tree; admin shell chrome.
4. Feature-flag evaluator + `flags.functions.ts` + admin CRUD screens.
5. Licensing types + `subscription` fns + admin subscription screen.
6. Company Module Manager (customer Settings → Modules) + dependency engine + `DynamicNav`.
7. Admin: Companies list, Platform Users, Global Audit, Analytics stubs.
8. Developer Portal skeleton route (`/developers` gated to `platform_role='developer'|'super_admin'`).
9. Tests (unit + integration + one Playwright isolation flow).
10. Docs: `docs/architecture-m2.md`, `docs/modules/authoring.md`, `docs/rbac-platform.md`.

**Exit criteria**: a super_admin can define a plan, toggle a module globally and per company, flip a feature flag per company; a company owner can enable/disable an allowed module and see nav update; customer↔admin isolation proven by tests; zero business-module code shipped.

---

Approve and I'll execute steps 1–10 in order. If you want the Developer Portal to also get real functionality (API keys, sandbox, docs viewer) instead of just an architectural skeleton, say so before I start.
