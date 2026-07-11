
# Milestone 3 — Communication & Event Platform

Shared infrastructure every future module uses to publish events, notify users, send email, and run background work. No business modules are built here.

## 1. Requirements

**In scope**
- Event Bus: publish/subscribe with typed event registry, versioned payloads, per-module subscribers, async dispatch, retries, dead-letter.
- Event Registry: in-code manifests (`src/platform/events/*`) + DB mirror (`platform_events`) with payload schema, version, publisher, subscribers, docs.
- Notification Center: unified in-app notifications (unread/read/archived/pinned-ready, priority, category, source module, entity, deep link).
- Email Service: single sender wrapping Lovable Emails; templates in `src/lib/email-templates/`; every module calls it, never Resend/SDKs directly.
- Templates: email + in-app; SMS/WhatsApp table shape reserved (channel enum extendable, no adapter yet).
- User Preferences: per-user per-category + per-channel toggles; quiet hours + digest columns present (evaluated in a later milestone).
- Real-Time Delivery: Supabase Realtime on `notifications` table filtered by `recipient_user_id`.
- Background Jobs: `jobs` table + `job_runs` history + pg_cron dispatcher hitting a public server route that leases and runs jobs; statuses queued/running/completed/failed/cancelled + retry with backoff.
- Communication Logs: `communication_logs` for every send attempt (email, in-app, future channels) — sender, recipient, channel, status, retries, errors, company, module.
- AI hook: AI capabilities may register as event subscribers via the same registry (no LLM calls executed here).

**Out of scope**
- SMS/WhatsApp senders, real digest/quiet-hour scheduling, marketing campaigns, external webhooks out, any business module.

**Non-functional**
- Multi-tenant (company_id on every row), RLS on every table via `private.*` helpers, audit logging preserved.
- Publish is O(1) enqueue; dispatch async so publisher latency is not coupled to subscriber count.

## 2. Architecture

```text
Module code
  │  publishEvent('invoice.paid', payload)          notify(userId, {...})
  ▼                                                 │
┌─ src/platform/events/bus.functions.ts ─┐          ▼
│ validate against registry (Zod)         │  ┌─ src/platform/notifications/notify.functions.ts ─┐
│ insert into event_queue (status=queued) │  │ resolve prefs → insert notifications              │
│ append event_log                        │  │ + communication_logs; realtime broadcasts         │
└──────────────┬──────────────────────────┘  │ via Supabase postgres_changes                     │
               │                             └───────────────────────────────────────────────────┘
               ▼
pg_cron (every minute) ─► POST /api/public/hooks/event-dispatcher (apikey)
               │
               ▼
lease N queued events → for each: look up subscribers in registry
               │
               ├─► subscriber = "notification"  → notify.functions
               ├─► subscriber = "email"         → email.functions → Lovable Emails
               ├─► subscriber = "job"           → enqueue jobs row
               └─► subscriber = "ai"            → record ai_dispatch (no-op executor)
mark event completed/failed(+retry with backoff, max 5) → event_log

pg_cron (every minute) ─► POST /api/public/hooks/job-runner (apikey)
               │
               ▼
lease N queued jobs → run handler from src/platform/jobs/handlers/*
               │
               ▼
update job status, append job_runs, on failure schedule retry
```

Realtime: browser subscribes to `notifications` filtered `recipient_user_id=eq.<uid>` inside a `useEffect` in the app shell.

## 3. Folder Structure

```text
src/platform/
  events/
    registry.ts              # EventDefinition type + in-code registry
    definitions/             # one file per event group
      identity.ts            # user.invited, role.changed, member.added
      company.ts             # company.created, company.suspended
      module.ts              # module.enabled, module.disabled
      billing.ts             # subscription.*
      security.ts            # security.alert
    bus.functions.ts         # publishEvent, listEvents (admin)
    dispatcher.ts            # pure lease/dispatch logic (tested)
  notifications/
    notify.functions.ts      # notify(), listMine, markRead, archive, prefs get/set
    templates.ts             # in-app template rendering
  email/
    send.functions.ts        # sendEmail() — the only email entry point
    templates registry lives under src/lib/email-templates/
  jobs/
    jobs.functions.ts        # enqueueJob, listMine (admin), cancel
    runner.ts                # pure lease/run logic
    handlers/                # jobType → async fn
      email.send.ts
      notification.digest.ts # stub for later
      _index.ts              # export map
  comms/
    logs.functions.ts        # listCommunicationLogs (admin/company)
src/routes/
  api/public/hooks/
    event-dispatcher.ts      # cron endpoint (apikey auth)
    job-runner.ts            # cron endpoint (apikey auth)
  _authenticated/
    app.notifications.tsx    # user inbox
    app.settings.notifications.tsx  # preferences
  _platform/
    admin.events.tsx         # event registry + queue viewer
    admin.jobs.tsx           # job queue viewer
    admin.communications.tsx # communication logs viewer
src/components/notifications/
  NotificationBell.tsx
  NotificationList.tsx
  PreferencesForm.tsx
src/lib/email-templates/
  invitation.tsx  password-reset.tsx  welcome.tsx  security-alert.tsx
tests/
  unit/{event-registry,dispatcher,job-runner,prefs-eval}.test.ts
  integration/{publish-to-notify,email-send,rls-comms}.test.ts
```

## 4. Database (all `public.*`, RLS on, GRANTs, audit triggers where mutating)

- `platform_events(key text pk, version int, publisher_module_id, description, payload_schema jsonb, subscribers jsonb, is_active bool, timestamps)` — mirror of code registry.
- `event_queue(id, company_id nullable, event_key, version, payload jsonb, status enum[queued,running,completed,failed,dead], attempts int, next_run_at, last_error text, published_by uuid, timestamps)`.
- `event_log(id, event_queue_id, level enum[info,warn,error], message, meta jsonb, created_at)` — append-only.
- `notifications(id, company_id, recipient_user_id, source_module_id, category enum[system,business,security,ai,billing,modules], priority enum[low,normal,high,critical], title, message, entity_type, entity_id, deep_link, status enum[unread,read,archived], pinned bool default false, created_at, read_at, archived_at)`.
- `notification_preferences(id, user_id, company_id nullable, channel enum[email,in_app,sms,whatsapp], category enum..., enabled bool, quiet_hours_start time null, quiet_hours_end time null, digest_frequency enum[none,daily,weekly] default 'none', unique(user_id, company_id, channel, category))`.
- `communication_channel` enum: `email, in_app, sms, whatsapp`.
- `communication_logs(id, company_id nullable, module_id, channel communication_channel, recipient_user_id nullable, recipient_address text, status enum[queued,sent,failed,suppressed,rate_limited], template_key, subject, provider_message_id, error text, attempts int, created_at, sent_at)`.
- `notification_templates(id, key unique, channel communication_channel, subject, body_template text, variables jsonb, is_active bool, timestamps)` — in-app + future SMS. Email templates stay React Email files.
- `jobs(id, company_id nullable, module_id, job_type text, payload jsonb, status enum[queued,running,completed,failed,cancelled], priority int default 100, attempts int default 0, max_attempts int default 3, scheduled_for timestamptz default now(), locked_at, locked_by text, last_error, created_by, timestamps)`.
- `job_runs(id, job_id, attempt int, status enum[running,completed,failed,cancelled], started_at, finished_at, error text, output jsonb)`.

**RLS**
- `notifications`: SELECT/UPDATE where `recipient_user_id = auth.uid()`; INSERT via service role only.
- `notification_preferences`: user manages own rows.
- `communication_logs`, `jobs`, `job_runs`, `event_queue`, `event_log`: SELECT where `private.is_company_member(company_id)` AND `private.has_permission(company_id,'comms.read')`; writes service role only.
- `platform_events`, `notification_templates`: SELECT to `authenticated` (catalog); writes require `private.is_platform_admin`.

**Permissions seeded**: `comms.read`, `comms.manage`, `notifications.read.self`, `platform.events.manage`, `platform.jobs.manage`, `platform.comms.read`.

## 5. API Design (server functions unless noted)

Modules use these only.

- `events.publish({ key, version?, companyId?, payload })` — validates against registry, inserts `event_queue`, returns `{ id }`.
- `events.listQueue({ companyId?, status? })` — admin/company (perm-gated).
- `notifications.notify({ recipientUserId, category, priority, title, message, sourceModuleId, entityType?, entityId?, deepLink? })` — checks prefs, inserts row, logs.
- `notifications.listMine({ status?, cursor? })`, `markRead({ id })`, `markAllRead()`, `archive({ id })`.
- `notifications.prefs.get()`, `prefs.set({ channel, category, enabled, ...quietHours, digestFrequency })`.
- `email.send({ templateKey, to, templateData, companyId?, moduleId, idempotencyKey })` — wraps `sendTemplateEmail`, writes `communication_logs`.
- `jobs.enqueue({ jobType, payload, companyId?, moduleId, scheduledFor?, maxAttempts? })`, `jobs.cancel({ id })`, `jobs.listMine`.
- `comms.logs.list({ companyId?, filters })`.

Cron routes (`/api/public/hooks/*`, `apikey` header verified against `SUPABASE_ANON_KEY`):
- `event-dispatcher` — lease up to 50 queued events, fan out to subscribers, retry with exponential backoff.
- `job-runner` — lease up to 25 queued jobs, invoke handler map, record `job_runs`.

## 6. UI/UX

- **App shell**: `<NotificationBell>` in the top bar shows unread count via realtime; opens dropdown; "See all" → `/app/notifications` inbox with filter (Unread/All/Archived) + priority chips.
- **Preferences**: `/app/settings/notifications` grid (rows: categories, cols: channels) with toggles + quiet-hours pickers + digest select (digest disabled with tooltip "coming soon").
- **Admin**:
  - `/admin/events` — registry cards (key, publisher, subscribers, version) + queue table (status, attempts, last error, retry action).
  - `/admin/jobs` — queue table, filter by status/type, cancel/requeue actions.
  - `/admin/communications` — cross-tenant communication logs with company + module filters.
- Reuse existing tokens; no design-system change.

## 7. Business Rules

- Publishing an unknown or inactive event key throws.
- Payload rejected if it fails Zod validation from the registry.
- Notifications suppressed when user has `in_app` for that category disabled — still logged in `communication_logs` with `status='suppressed'`.
- Email suppressed similarly for `email` channel; `sendTemplateEmail`'s own `recipient_suppressed` is also logged as `suppressed`.
- Retry: attempts < max_attempts → `next_run_at = now() + interval '30 seconds' * 2^attempts`; on final failure → `dead`/`failed`, emits `event.dead_letter` (subscribed by security notification).
- `security` and `critical` notifications ignore user in-app preference (still respect email preference).
- `is_core` module events cannot be marked inactive by a company; only platform admins can toggle `platform_events.is_active`.
- Cancelling a running job marks it `cancelled` but lets the current attempt finish (best effort).

## 8. Security

- Cron routes require `apikey` header matching `SUPABASE_ANON_KEY`; internally use `supabaseAdmin` only after header check.
- No module accepts arbitrary HTML into notifications — messages are plain text; deep links validated as same-origin paths.
- Event payloads never contain secrets — enforced by convention + code review; payload schemas exclude token-shaped fields.
- All admin viewers surface metadata only (no message bodies for other tenants unless caller has `platform.comms.read`).
- RLS as above; every mutation via server fn writes to `audit.audit_logs`.

## 9. Testing

- **Unit**: event registry Zod round-trip; dispatcher (lease/backoff/dead-letter); job runner (retry semantics); preferences evaluator (category × channel × critical override).
- **Integration**: publish `user.invited` → email sent + in-app notification + comm log rows; RLS matrix on new tables; suppressed prefs produce `suppressed` log without notification row.
- **E2E** (Playwright): notification bell increments in realtime when a second session publishes an event; preferences toggle hides subsequent notifications.

## 10. Delivery

1. Migration: enums, tables, RLS + GRANTs + audit triggers, seed permissions and baseline templates.
2. `src/platform/events/registry.ts` + baseline event definitions + `bus.functions.ts`.
3. `notifications/notify.functions.ts` + preferences fns + templates seed.
4. `email/send.functions.ts` wrapping `sendTemplateEmail`; migrate existing invite/reset call sites through it.
5. `jobs` fns + runner + handler map (email.send handler backs `email.send`).
6. Cron routes `event-dispatcher` and `job-runner` + pg_cron schedules (SQL via insert tool after migration).
7. UI: NotificationBell, inbox route, preferences route.
8. Admin UI: `/admin/events`, `/admin/jobs`, `/admin/communications`.
9. Tests (unit + integration + one Playwright realtime flow).
10. Docs: `docs/architecture-m3.md`, `docs/events/authoring.md`, `docs/notifications.md`, `docs/jobs.md`.

**Exit criteria**: any module can `events.publish(...)`; subscribers receive notifications/emails via the bus with retries and full comm logs; users manage per-channel preferences; realtime bell works; admin sees registry, queues, and logs. No business-module code introduced.

Approve and I'll execute steps 1–10 in order.
