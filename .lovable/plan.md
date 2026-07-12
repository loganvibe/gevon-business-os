# Milestone 4 — CRM Foundation

Foundational customer-relationship platform. Not Sales, not Accounting. Every future business module (Sales, Marketing, Support, Invoicing, Reporting, AI) will reference these entities instead of duplicating them.

Milestones 1–3 architecture (auth, tenancy, RBAC, RLS, audit, module registry, event bus, notifications, jobs, email) is reused untouched.

## 1. Scope

**In scope**
- CRM module manifest registered via `src/platform/registry.ts` (category `customer`, tier `starter`, depends on `core`).
- Entities: leads, contacts, organizations, deals (with pipelines + stages), activities, notes, tags, custom fields, attachments.
- Contact ↔ Organization many-to-many with primary flag.
- Configurable pipelines and stages per company; seeded default pipeline.
- Central tags table + polymorphic taggables.
- Custom fields registry + values table (typed by column-per-type, indexed via GIN on jsonb fallback).
- Attachments via new Lovable Cloud storage bucket `crm-attachments` (private, RLS-scoped) with `crm_attachments` metadata table.
- Global search: single `crm_search_index` materialized view + `search_crm({ q, types })` server fn using Postgres `websearch_to_tsquery`.
- AI Registry hooks: register capabilities (`lead.score`, `deal.summary`, `followup.suggest`, `account.health`) via existing `module_ai_capabilities`. No LLM calls.
- Event Bus integration: register CRM events in `src/platform/events/definitions/crm.ts` and publish through `events.publish`. Wire notification/email subscribers via existing registry.
- CRM dashboard route + widgets registered in Dashboard Widget Registry (new lightweight registry — see Technical section).
- Permissions: `crm.read`, `crm.write`, `crm.delete`, `crm.admin`, `crm.pipelines.manage`, `crm.custom_fields.manage`, `crm.tags.manage` — seeded and granted to owner/admin roles.
- Soft deletes (`deleted_at`) on leads, contacts, organizations, deals, notes, activities. Views filter deleted rows.
- Pagination (keyset), filtering, sorting, saved views (`crm_saved_views`).

**Out of scope**
- Automations/workflows, sequences, campaign sends, quotes/invoices, forecasting, real LLM implementations, mobile app, calendar sync.

## 2. Architecture

```text
src/modules/crm/
  index.ts                       # manifest + registerModule(crmModule)
  events.ts                      # CRM event definitions (re-exported by src/platform/events/definitions/crm.ts)
  widgets/                       # dashboard widget components
    TotalLeads.tsx  ActiveDeals.tsx  WonDeals.tsx  LostDeals.tsx
    PipelineValue.tsx  RecentActivities.tsx  UpcomingTasks.tsx  AIInsights.tsx
    _registry.ts                 # registers each with dashboard widget registry
  server/
    leads.functions.ts           # list/get/create/update/archive/convert/delete
    contacts.functions.ts
    organizations.functions.ts
    deals.functions.ts           # includes pipeline/stage CRUD (perm-gated)
    activities.functions.ts
    notes.functions.ts
    tags.functions.ts
    custom-fields.functions.ts
    attachments.functions.ts     # signed upload URL + metadata
    search.functions.ts          # search_crm()
    saved-views.functions.ts
  components/
    LeadsTable.tsx  ContactsTable.tsx  OrgsTable.tsx  DealsBoard.tsx
    ActivityTimeline.tsx  NoteThread.tsx  TagPicker.tsx
    CustomFieldEditor.tsx  AttachmentList.tsx  GlobalSearchBox.tsx

src/platform/dashboard/
  registry.ts                    # DashboardWidget type + registerWidget/allWidgets
  functions.ts                   # listMyWidgets({ dashboardKey })

src/platform/events/definitions/crm.ts   # thin re-export of module CRM events

src/routes/_authenticated/
  app.crm.tsx                    # layout (tabs: Dashboard, Leads, Contacts, Orgs, Deals, Activities)
  app.crm.index.tsx              # CRM dashboard
  app.crm.leads.tsx  app.crm.leads.$id.tsx
  app.crm.contacts.tsx  app.crm.contacts.$id.tsx
  app.crm.organizations.tsx  app.crm.organizations.$id.tsx
  app.crm.deals.tsx  app.crm.deals.$id.tsx
  app.crm.activities.tsx
  app.crm.settings.tsx  (pipelines, stages, tags, custom fields, saved views)

docs/
  architecture-m4.md  crm/entities.md  crm/events.md  crm/custom-fields.md
  crm/search.md  crm/dashboard-widgets.md
```

## 3. Database (all `public.*`, RLS on, GRANTs, audit triggers)

Enums: `lead_status` (new, contacted, qualified, proposal, negotiation, won, lost), `activity_type` (call, meeting, email, task, followup), `activity_status` (planned, in_progress, completed, cancelled), `custom_field_type` (text, number, date, boolean, select, multiselect, currency, url), `crm_entity_type` (lead, contact, organization, deal), `deal_status` (open, won, lost).

Tables:
- `crm_pipelines(id, company_id, name, is_default bool, timestamps, deleted_at)`
- `crm_pipeline_stages(id, pipeline_id, name, position int, probability numeric, is_won bool, is_lost bool, timestamps)`
- `crm_organizations(id, company_id, name, industry, tax_id, website, phone, email, address jsonb, notes text, assigned_to uuid, timestamps, deleted_at)`
- `crm_contacts(id, company_id, first_name, last_name, job_title, department, birthday date, preferred_channel communication_channel, socials jsonb, notes, assigned_to, timestamps, deleted_at)`
- `crm_contact_emails(id, contact_id, email, label, is_primary)` + unique(contact_id, email)
- `crm_contact_phones(id, contact_id, phone, label, is_primary)`
- `crm_contact_organizations(contact_id, organization_id, role, is_primary, primary key(contact_id, organization_id))`
- `crm_leads(id, company_id, source, status lead_status, contact_id nullable, organization_id nullable, estimated_value numeric, currency_code, assigned_to, converted_at, converted_deal_id, timestamps, deleted_at)`
- `crm_lead_status_history(id, lead_id, from_status, to_status, changed_by, changed_at)`
- `crm_deals(id, company_id, pipeline_id, stage_id, name, value numeric, currency_code, probability numeric, expected_close_date date, status deal_status, contact_id nullable, organization_id nullable, assigned_to, closed_at, timestamps, deleted_at)`
- `crm_deal_collaborators(deal_id, user_id, role, primary key(deal_id, user_id))`
- `crm_activities(id, company_id, type activity_type, status activity_status, subject, body text, due_at, completed_at, assigned_to, related_type crm_entity_type, related_id uuid, timestamps, deleted_at)`
- `crm_notes(id, company_id, author_id, body_html text, mentions uuid[], related_type crm_entity_type, related_id uuid, timestamps, deleted_at)`
- `crm_tags(id, company_id, name, color, timestamps)` + unique(company_id, name)
- `crm_taggables(tag_id, entity_type crm_entity_type, entity_id uuid, primary key(tag_id, entity_type, entity_id))`
- `crm_custom_fields(id, company_id, entity_type crm_entity_type, key, label, type custom_field_type, options jsonb, is_required bool, position int, timestamps)` + unique(company_id, entity_type, key)
- `crm_custom_field_values(field_id, entity_id, value_text, value_number, value_date, value_bool, value_json jsonb, primary key(field_id, entity_id))`
- `crm_attachments(id, company_id, uploader_id, storage_path text, filename, mime_type, size_bytes, version int, related_type crm_entity_type, related_id uuid, timestamps, deleted_at)`
- `crm_saved_views(id, company_id, user_id nullable (shared if null), entity_type crm_entity_type, name, filters jsonb, sort jsonb, is_shared bool, timestamps)`
- `crm_search_index` — materialized view union of leads/contacts/orgs/deals with `tsvector`; GIN index; refreshed by background job on write (event subscriber → `crm.search.reindex` job).

RLS: every table restricted by `private.is_company_member(company_id)`; writes gated by permission via `private.has_permission(company_id, 'crm.write')` (or `crm.delete`/`crm.admin`). Storage bucket policies key on `company_id` prefix in the object path. Audit triggers via existing `public.audit_m2_change()` on all mutating tables.

Seeds: default pipeline `Sales Pipeline` with stages New/Contacted/Qualified/Proposal/Negotiation/Won/Lost per company (created by trigger on `companies` insert AFTER core seed).

## 4. CRM Events (registered in `src/modules/crm/events.ts`)

`crm.lead.created`, `crm.lead.updated`, `crm.lead.converted`, `crm.deal.created`, `crm.deal.stage_changed`, `crm.deal.won`, `crm.deal.lost`, `crm.contact.created`, `crm.contact.updated`, `crm.organization.created`, `crm.organization.updated`, `crm.activity.completed`, `crm.task.due_soon`.

Each defines Zod payload, publisher `crm`, subscribers wired to in-app notifications (assignee) and (for won/lost/converted) email templates. Search-index refresh is subscribed via a `job` subscriber (`crm.search.reindex`).

## 5. API Design (server functions)

All under `src/modules/crm/server/*.functions.ts`, all `.middleware([requireSupabaseAuth])`, permission checks via `has_permission`. Standard shape:

- `list*({ companyId, filters, sort, cursor, limit })` — keyset pagination, returns `{ items, nextCursor }`.
- `get*({ id })`, `create*(data)`, `update*({ id, patch })`, `archive*({ id })` (soft delete), `restore*({ id })`, `delete*({ id })` (hard delete; `crm.delete` only).
- `convertLead({ id, dealOverrides })` — atomic: creates deal from lead, links contact/org, sets status=won path optional, publishes `crm.lead.converted`.
- `deals.moveStage({ id, stageId })` — publishes `crm.deal.stage_changed`; if stage.is_won/is_lost → `crm.deal.won|lost`.
- `pipelines.upsertStage`, `pipelines.reorderStages`, `pipelines.create/delete` (perm `crm.pipelines.manage`).
- `tags.create/delete/apply/remove`.
- `customFields.list/create/update/delete` + `customFieldValues.set({ entityId, values })`.
- `attachments.getUploadUrl({ relatedType, relatedId, filename, mime })` → returns signed URL; `attachments.confirm({ path, metadata })` inserts row; `attachments.delete({ id })` soft-delete + storage remove.
- `search_crm({ q, types?, limit? })` — Postgres FTS.
- `savedViews.list/upsert/delete`.
- `dashboard.summary({ companyId })` — returns totals for widgets in one call.

## 6. UI/UX

- `/app/crm` layout with left rail: Dashboard, Leads, Contacts, Organizations, Deals, Activities, Settings.
- Dashboard uses widget registry (`listMyWidgets({ dashboardKey: 'crm' })`) — order/visibility controllable later.
- Tables: shadcn Table + column chooser + saved-view dropdown + filter drawer.
- Deals: Kanban board (`DealsBoard`) grouped by stage; drag to change stage (calls `moveStage`).
- Activity Timeline: unified feed component reused on lead/contact/org/deal detail pages.
- Global Search: `Cmd/Ctrl+K` opens `GlobalSearchBox` mounted in `src/routes/_authenticated/app.tsx` top bar (only when CRM module enabled).
- All create/edit uses shadcn Dialog + react-hook-form + zod.
- Reuse existing tokens; no design-system change.

## 7. Business Rules

- Only companies with `company_modules.enabled` for `crm` see routes / widgets / nav. `_authenticated/app.crm.*` loaders throw `notFound()` otherwise.
- Converting a lead: contact and organization created if missing, deal created in default pipeline (or provided pipeline), lead marked `won` + `converted_deal_id`, history row appended. Idempotent by `lead.id`.
- Deal `status` derived from stage flags (`is_won`/`is_lost`); direct writes to `status` rejected by trigger.
- Custom fields marked `is_required` are validated in server fns before insert/update.
- Attachments: max 25 MB (validated in `getUploadUrl`), MIME allowlist, virus-scan hook stubbed.
- Global search returns only rows the caller's RLS allows (view is defined `security invoker`).
- Search reindex runs asynchronously; UI does not block writes.

## 8. Security

- All new tables RLS as above; `service_role` bypass only for admin/maintenance.
- Storage bucket `crm-attachments` created private via `supabase--storage_create_bucket`; RLS policies on `storage.objects` restrict path prefix `${company_id}/...` to members with `crm.read`; delete requires `crm.delete` or uploader.
- No secrets in payloads; sanitize note HTML server-side (allowlist).
- Rate limits via existing job queue (search reindex debounced).
- Permissions enforced at server-fn boundary AND RLS; UI only hides controls.

## 9. Testing

- Unit: convert-lead atomicity, deal stage → status derivation, custom-field validation, tag apply/remove, keyset pagination, search query builder.
- Integration: RLS matrix (cross-company denial), permission gates (viewer vs editor vs admin), attachment signed-URL flow, saved-views sharing.
- Event tests: creating a lead publishes `crm.lead.created`; assignee receives notification; won deal triggers email subscriber.
- Dashboard widget registry test: widgets registered for `crm` return in `listMyWidgets`.
- Search test: FTS returns leads/contacts/orgs/deals for a token; respects RLS.
- Playwright: create lead → convert → verify deal appears on board and event fires (bell increments).

## 10. Delivery Order

1. Migration A — enums, pipelines/stages, orgs, contacts (+ emails/phones/orgs join), leads (+ history), deals (+ collaborators), activities, notes, tags (+ taggables), custom fields (+ values), attachments, saved views, permissions seed, audit triggers, default-pipeline trigger.
2. Migration B — `crm_search_index` matview + GIN index + refresh function.
3. Storage bucket `crm-attachments` + RLS policies.
4. `src/modules/crm/index.ts` manifest + `events.ts`; register in `src/platform/registry.ts` and `src/platform/events/definitions/crm.ts`.
5. Dashboard Widget Registry (`src/platform/dashboard/*`) + widget components + `_registry.ts`.
6. Server functions per entity (list/get/CRUD/convert/search/attachments/saved-views/custom-fields/tags/pipelines).
7. UI routes + components (layout, dashboard, tables, kanban, timeline, settings).
8. Global search box mounted in authenticated top bar.
9. Tests (unit + integration + one Playwright flow).
10. Docs: `docs/architecture-m4.md`, `docs/crm/*.md`.

**Exit criteria**: CRM module can be enabled per company; users with `crm.*` perms can manage leads/contacts/orgs/deals/activities/notes/tags/custom fields/attachments; dashboard widgets render; global search returns CRM entities; CRM events flow through the bus to notifications/email; permissions + RLS enforced end-to-end; no business-module logic beyond CRM introduced.

Approve and I'll execute steps 1–10 in order.
