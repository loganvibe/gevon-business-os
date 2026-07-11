
-- =========================================================
-- M3: Communication & Event Platform
-- =========================================================

create type public.event_status as enum ('queued','running','completed','failed','dead');
create type public.event_log_level as enum ('info','warn','error');
create type public.notification_category as enum ('system','business','security','ai','billing','modules');
create type public.notification_priority as enum ('low','normal','high','critical');
create type public.notification_status as enum ('unread','read','archived');
create type public.communication_channel as enum ('email','in_app','sms','whatsapp');
create type public.communication_status as enum ('queued','sent','failed','suppressed','rate_limited');
create type public.digest_frequency as enum ('none','daily','weekly');
create type public.job_status as enum ('queued','running','completed','failed','cancelled');

-- platform_events
create table public.platform_events (
  key text primary key,
  version int not null default 1,
  publisher_module_id text references public.modules(id) on delete set null,
  description text not null default '',
  payload_schema jsonb not null default '{}'::jsonb,
  subscribers jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.platform_events to authenticated;
grant all on public.platform_events to service_role;
alter table public.platform_events enable row level security;
create policy platform_events_select on public.platform_events for select to authenticated using (true);
create policy platform_events_write on public.platform_events for all to authenticated
  using (private.is_platform_admin(auth.uid())) with check (private.is_platform_admin(auth.uid()));
create trigger tr_platform_events_updated before update on public.platform_events
  for each row execute function public.set_updated_at();

-- event_queue
create table public.event_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  event_key text not null references public.platform_events(key) on delete restrict,
  version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  status public.event_status not null default 'queued',
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_run_at timestamptz not null default now(),
  last_error text,
  published_by uuid references auth.users(id),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.event_queue to authenticated;
grant all on public.event_queue to service_role;
alter table public.event_queue enable row level security;
create policy event_queue_select on public.event_queue for select to authenticated using (
  private.is_platform_admin(auth.uid())
  or (company_id is not null and private.has_permission(company_id, 'comms.read'))
);
create index event_queue_status_next_run_idx on public.event_queue(status, next_run_at);
create index event_queue_company_idx on public.event_queue(company_id, created_at desc);
create trigger tr_event_queue_updated before update on public.event_queue
  for each row execute function public.set_updated_at();

-- event_log
create table public.event_log (
  id uuid primary key default gen_random_uuid(),
  event_queue_id uuid not null references public.event_queue(id) on delete cascade,
  level public.event_log_level not null default 'info',
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.event_log to authenticated;
grant all on public.event_log to service_role;
alter table public.event_log enable row level security;
create policy event_log_select on public.event_log for select to authenticated using (
  private.is_platform_admin(auth.uid())
  or exists (
    select 1 from public.event_queue q where q.id = event_log.event_queue_id
      and q.company_id is not null and private.has_permission(q.company_id, 'comms.read')
  )
);
create index event_log_queue_idx on public.event_log(event_queue_id, created_at desc);

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  source_module_id text references public.modules(id) on delete set null,
  category public.notification_category not null default 'system',
  priority public.notification_priority not null default 'normal',
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  deep_link text,
  status public.notification_status not null default 'unread',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());
create index notifications_recipient_status_idx on public.notifications(recipient_user_id, status, created_at desc);
alter publication supabase_realtime add table public.notifications;

-- notification_preferences
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  channel public.communication_channel not null,
  category public.notification_category not null,
  enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  digest_frequency public.digest_frequency not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id, channel, category)
);
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
alter table public.notification_preferences enable row level security;
create policy prefs_select_own on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());
create policy prefs_write_own on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger tr_prefs_updated before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- notification_templates
create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  channel public.communication_channel not null,
  subject text,
  body_template text not null,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.notification_templates to authenticated;
grant all on public.notification_templates to service_role;
alter table public.notification_templates enable row level security;
create policy notif_templates_select on public.notification_templates for select to authenticated using (true);
create policy notif_templates_write on public.notification_templates for all to authenticated
  using (private.is_platform_admin(auth.uid())) with check (private.is_platform_admin(auth.uid()));
create trigger tr_notif_templates_updated before update on public.notification_templates
  for each row execute function public.set_updated_at();

-- communication_logs
create table public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  module_id text references public.modules(id) on delete set null,
  channel public.communication_channel not null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_address text,
  status public.communication_status not null default 'queued',
  template_key text,
  subject text,
  provider_message_id text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
grant select on public.communication_logs to authenticated;
grant all on public.communication_logs to service_role;
alter table public.communication_logs enable row level security;
create policy comms_logs_select on public.communication_logs for select to authenticated using (
  private.is_platform_admin(auth.uid())
  or (company_id is not null and private.has_permission(company_id, 'comms.read'))
  or recipient_user_id = auth.uid()
);
create index comms_logs_company_idx on public.communication_logs(company_id, created_at desc);
create index comms_logs_recipient_idx on public.communication_logs(recipient_user_id, created_at desc);

-- jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  module_id text references public.modules(id) on delete set null,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'queued',
  priority int not null default 100,
  attempts int not null default 0,
  max_attempts int not null default 3,
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy jobs_select on public.jobs for select to authenticated using (
  private.is_platform_admin(auth.uid())
  or (company_id is not null and private.has_permission(company_id, 'comms.read'))
);
create index jobs_status_scheduled_idx on public.jobs(status, scheduled_for);
create index jobs_company_idx on public.jobs(company_id, created_at desc);
create trigger tr_jobs_updated before update on public.jobs
  for each row execute function public.set_updated_at();

-- job_runs
create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  attempt int not null,
  status public.job_status not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  output jsonb
);
grant select on public.job_runs to authenticated;
grant all on public.job_runs to service_role;
alter table public.job_runs enable row level security;
create policy job_runs_select on public.job_runs for select to authenticated using (
  private.is_platform_admin(auth.uid())
  or exists (
    select 1 from public.jobs j where j.id = job_runs.job_id
      and j.company_id is not null and private.has_permission(j.company_id, 'comms.read')
  )
);
create index job_runs_job_idx on public.job_runs(job_id, started_at desc);

-- Audit triggers
create trigger tr_audit_platform_events after insert or update or delete on public.platform_events
  for each row execute function public.audit_m2_change();
create trigger tr_audit_notification_templates after insert or update or delete on public.notification_templates
  for each row execute function public.audit_m2_change();
create trigger tr_audit_jobs after insert or update or delete on public.jobs
  for each row execute function public.audit_m2_change();

-- Permissions seed (module, description)
insert into public.permissions(key, module, description) values
  ('comms.read', 'core', 'View communication logs, event queue, jobs for a company'),
  ('comms.manage', 'core', 'Manage communication settings for a company'),
  ('notifications.read.self', 'core', 'Read own notifications (implicit)'),
  ('platform.events.manage', 'platform', 'Platform: manage event registry'),
  ('platform.jobs.manage', 'platform', 'Platform: manage background jobs'),
  ('platform.comms.read', 'platform', 'Platform: read cross-tenant communication logs')
on conflict (key) do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values ('comms.read'),('comms.manage')) as p(key)
where r.key in ('owner','admin')
on conflict do nothing;

-- Baseline in-app templates
insert into public.notification_templates(key, channel, subject, body_template, variables) values
  ('user.invited.in_app', 'in_app', 'You have a new invitation',
   'You were invited to join {{companyName}} as {{roleName}}.',
   '["companyName","roleName"]'::jsonb),
  ('role.changed.in_app', 'in_app', 'Your role has changed',
   'Your role in {{companyName}} is now {{roleName}}.',
   '["companyName","roleName"]'::jsonb),
  ('security.alert.in_app', 'in_app', 'Security alert',
   '{{message}}',
   '["message"]'::jsonb),
  ('module.enabled.in_app', 'in_app', 'Module enabled',
   'The {{moduleName}} module has been enabled for {{companyName}}.',
   '["moduleName","companyName"]'::jsonb)
on conflict (key) do nothing;
