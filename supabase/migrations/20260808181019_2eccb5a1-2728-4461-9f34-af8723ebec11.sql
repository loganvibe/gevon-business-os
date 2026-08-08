-- ============================================================
-- MILESTONE 10 — WORKFLOW & AUTOMATION ENGINE
-- ============================================================

-- ---------------------------- ENUMS -------------------------
do $$ begin
  create type public.task_status as enum ('todo','in_progress','waiting','completed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_priority as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.workflow_run_status as enum ('pending','running','completed','failed','skipped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.approval_status as enum ('draft','pending','approved','rejected','changes_requested','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.approval_step_status as enum ('pending','approved','rejected','changes_requested','skipped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.request_status as enum ('draft','submitted','under_review','approved','rejected','completed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.internal_request_type as enum ('purchase','expense','leave','stock_adjustment','maintenance','staff','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.reminder_status as enum ('scheduled','sent','cancelled','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.calendar_event_type as enum ('task','meeting','reminder','leave','appointment','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.assignee_kind as enum ('user','role','department','branch','manager','team','creator');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.workflow_action_type as enum (
    'create_task','send_notification','queue_email','create_approval','create_alert',
    'assign_user','assign_team','publish_event','create_reminder','create_request','update_record');
exception when duplicate_object then null; end $$;

-- ---------------------------- TASKS -------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  due_at timestamptz,
  completed_at timestamptz,
  assigned_user_id uuid,
  assigned_role_id uuid references public.roles(id) on delete set null,
  assigned_department_id uuid references public.departments(id) on delete set null,
  assignee_kind public.assignee_kind not null default 'user',
  related_module text,
  related_entity_type text,
  related_entity_id uuid,
  source text not null default 'manual',
  source_workflow_run_id uuid,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index tasks_company_status_idx on public.tasks (company_id, status, due_at);
create index tasks_assignee_idx on public.tasks (company_id, assigned_user_id, status);
create index tasks_related_idx on public.tasks (company_id, related_entity_type, related_entity_id);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "tasks_read" on public.tasks for select to authenticated
  using (private.is_company_member(company_id)
         and (private.has_permission(company_id, 'task.view') or assigned_user_id = auth.uid() or created_by = auth.uid()));
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (private.has_permission(company_id, 'task.create'));
create policy "tasks_update" on public.tasks for update to authenticated
  using (private.is_company_member(company_id)
         and (private.has_permission(company_id, 'task.update') or assigned_user_id = auth.uid()))
  with check (private.is_company_member(company_id));
create policy "tasks_delete" on public.tasks for delete to authenticated
  using (private.has_permission(company_id, 'task.delete'));

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  author_id uuid,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);
grant select, insert, update, delete on public.task_comments to authenticated;
grant all on public.task_comments to service_role;
alter table public.task_comments enable row level security;
create policy "task_comments_read" on public.task_comments for select to authenticated
  using (private.is_company_member(company_id));
create policy "task_comments_write" on public.task_comments for all to authenticated
  using (private.is_company_member(company_id) and (author_id = auth.uid() or private.has_permission(company_id, 'task.update')))
  with check (private.is_company_member(company_id));

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  assignee_kind public.assignee_kind not null default 'user',
  assigned_user_id uuid,
  assigned_role_id uuid references public.roles(id) on delete set null,
  assigned_department_id uuid references public.departments(id) on delete set null,
  assigned_by uuid,
  note text,
  created_at timestamptz not null default now()
);
create index task_assignments_task_idx on public.task_assignments (task_id, created_at desc);
grant select, insert on public.task_assignments to authenticated;
grant all on public.task_assignments to service_role;
alter table public.task_assignments enable row level security;
create policy "task_assignments_read" on public.task_assignments for select to authenticated
  using (private.is_company_member(company_id));
create policy "task_assignments_insert" on public.task_assignments for insert to authenticated
  with check (private.has_permission(company_id, 'task.assign'));

-- -------------------------- WORKFLOWS -----------------------
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  module_id text,
  trigger_event text not null,
  conditions jsonb not null default '[]'::jsonb,
  condition_logic text not null default 'all',
  is_active boolean not null default true,
  run_count integer not null default 0,
  last_run_at timestamptz,
  owner_user_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index workflows_company_trigger_idx on public.workflows (company_id, trigger_event, is_active);
grant select, insert, update, delete on public.workflows to authenticated;
grant all on public.workflows to service_role;
alter table public.workflows enable row level security;
create policy "workflows_read" on public.workflows for select to authenticated
  using (private.has_permission(company_id, 'workflow.view'));
create policy "workflows_write" on public.workflows for all to authenticated
  using (private.has_permission(company_id, 'workflow.manage'))
  with check (private.has_permission(company_id, 'workflow.manage'));

create table public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  position integer not null default 0,
  action_type public.workflow_action_type not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflow_actions_wf_idx on public.workflow_actions (workflow_id, position);
grant select, insert, update, delete on public.workflow_actions to authenticated;
grant all on public.workflow_actions to service_role;
alter table public.workflow_actions enable row level security;
create policy "workflow_actions_read" on public.workflow_actions for select to authenticated
  using (private.has_permission(company_id, 'workflow.view'));
create policy "workflow_actions_write" on public.workflow_actions for all to authenticated
  using (private.has_permission(company_id, 'workflow.manage'))
  with check (private.has_permission(company_id, 'workflow.manage'));

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_key text,
  event_queue_id uuid,
  idempotency_key text,
  status public.workflow_run_status not null default 'pending',
  matched boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  attempts integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index workflow_runs_idem_uidx on public.workflow_runs (workflow_id, idempotency_key)
  where idempotency_key is not null;
create index workflow_runs_company_idx on public.workflow_runs (company_id, created_at desc);
grant select, insert, update on public.workflow_runs to authenticated;
grant all on public.workflow_runs to service_role;
alter table public.workflow_runs enable row level security;
create policy "workflow_runs_read" on public.workflow_runs for select to authenticated
  using (private.has_permission(company_id, 'workflow.view'));
create policy "workflow_runs_write" on public.workflow_runs for all to authenticated
  using (private.has_permission(company_id, 'workflow.execute'))
  with check (private.has_permission(company_id, 'workflow.execute'));

-- -------------------------- APPROVALS -----------------------
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  subject text not null,
  description text,
  module_id text,
  entity_type text,
  entity_id uuid,
  required_permission text,
  status public.approval_status not null default 'pending',
  current_step integer not null default 1,
  total_steps integer not null default 1,
  amount numeric(20,4),
  currency_code text,
  requested_by uuid,
  decided_at timestamptz,
  due_at timestamptz,
  escalation_level integer not null default 0,
  last_escalated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index approval_requests_company_idx on public.approval_requests (company_id, status, created_at desc);
create index approval_requests_entity_idx on public.approval_requests (company_id, entity_type, entity_id);
grant select, insert, update, delete on public.approval_requests to authenticated;
grant all on public.approval_requests to service_role;
alter table public.approval_requests enable row level security;
create policy "approval_requests_read" on public.approval_requests for select to authenticated
  using (private.is_company_member(company_id)
         and (private.has_permission(company_id, 'approval.view') or requested_by = auth.uid()));
create policy "approval_requests_insert" on public.approval_requests for insert to authenticated
  with check (private.is_company_member(company_id));
create policy "approval_requests_update" on public.approval_requests for update to authenticated
  using (private.has_permission(company_id, 'approval.manage') or private.has_permission(company_id, 'approval.approve'))
  with check (private.is_company_member(company_id));
create policy "approval_requests_delete" on public.approval_requests for delete to authenticated
  using (private.has_permission(company_id, 'approval.manage'));

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  step_number integer not null default 1,
  name text,
  approver_kind public.assignee_kind not null default 'user',
  approver_user_id uuid,
  approver_role_id uuid references public.roles(id) on delete set null,
  approver_department_id uuid references public.departments(id) on delete set null,
  status public.approval_step_status not null default 'pending',
  decided_by uuid,
  decided_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index approval_steps_uidx on public.approval_steps (approval_request_id, step_number);
grant select, insert, update on public.approval_steps to authenticated;
grant all on public.approval_steps to service_role;
alter table public.approval_steps enable row level security;
create policy "approval_steps_read" on public.approval_steps for select to authenticated
  using (private.is_company_member(company_id));
create policy "approval_steps_write" on public.approval_steps for all to authenticated
  using (private.has_permission(company_id, 'approval.approve') or private.has_permission(company_id, 'approval.manage'))
  with check (private.is_company_member(company_id));

create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  approval_step_id uuid references public.approval_steps(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  action text not null,
  actor_id uuid,
  comment text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index approval_actions_req_idx on public.approval_actions (approval_request_id, created_at);
grant select, insert on public.approval_actions to authenticated;
grant all on public.approval_actions to service_role;
alter table public.approval_actions enable row level security;
create policy "approval_actions_read" on public.approval_actions for select to authenticated
  using (private.is_company_member(company_id));
create policy "approval_actions_insert" on public.approval_actions for insert to authenticated
  with check (private.is_company_member(company_id));

-- ----------------------- AUTOMATION RULES -------------------
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  module_id text,
  trigger_kind text not null default 'event',
  trigger_event text,
  schedule_cron text,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  last_run_at timestamptz,
  run_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index automation_rules_company_idx on public.automation_rules (company_id, is_active);
grant select, insert, update, delete on public.automation_rules to authenticated;
grant all on public.automation_rules to service_role;
alter table public.automation_rules enable row level security;
create policy "automation_rules_read" on public.automation_rules for select to authenticated
  using (private.has_permission(company_id, 'automation.view'));
create policy "automation_rules_write" on public.automation_rules for all to authenticated
  using (private.has_permission(company_id, 'automation.manage'))
  with check (private.has_permission(company_id, 'automation.manage'));

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_rule_id uuid not null references public.automation_rules(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status public.workflow_run_status not null default 'pending',
  matched boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index automation_runs_rule_idx on public.automation_runs (automation_rule_id, created_at desc);
grant select, insert, update on public.automation_runs to authenticated;
grant all on public.automation_runs to service_role;
alter table public.automation_runs enable row level security;
create policy "automation_runs_read" on public.automation_runs for select to authenticated
  using (private.has_permission(company_id, 'automation.view'));
create policy "automation_runs_write" on public.automation_runs for all to authenticated
  using (private.has_permission(company_id, 'automation.manage'))
  with check (private.has_permission(company_id, 'automation.manage'));

-- ---------------------- INTERNAL REQUESTS -------------------
create table public.internal_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  request_number text,
  request_type public.internal_request_type not null default 'other',
  title text not null,
  description text,
  status public.request_status not null default 'draft',
  priority public.task_priority not null default 'normal',
  amount numeric(20,4),
  currency_code text,
  needed_by date,
  requested_by uuid,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  related_entity_type text,
  related_entity_id uuid,
  attachments jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index internal_requests_company_idx on public.internal_requests (company_id, status, created_at desc);
grant select, insert, update, delete on public.internal_requests to authenticated;
grant all on public.internal_requests to service_role;
alter table public.internal_requests enable row level security;
create policy "internal_requests_read" on public.internal_requests for select to authenticated
  using (private.is_company_member(company_id)
         and (private.has_permission(company_id, 'request.view') or requested_by = auth.uid()));
create policy "internal_requests_insert" on public.internal_requests for insert to authenticated
  with check (private.has_permission(company_id, 'request.create'));
create policy "internal_requests_update" on public.internal_requests for update to authenticated
  using (private.is_company_member(company_id)
         and (private.has_permission(company_id, 'request.approve') or requested_by = auth.uid()))
  with check (private.is_company_member(company_id));
create policy "internal_requests_delete" on public.internal_requests for delete to authenticated
  using (private.has_permission(company_id, 'request.approve'));

-- --------------------------- REMINDERS ----------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  message text,
  remind_at timestamptz not null,
  status public.reminder_status not null default 'scheduled',
  recipient_user_id uuid,
  related_entity_type text,
  related_entity_id uuid,
  deep_link text,
  repeat_interval text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders (status, remind_at);
create index reminders_company_idx on public.reminders (company_id, remind_at desc);
grant select, insert, update, delete on public.reminders to authenticated;
grant all on public.reminders to service_role;
alter table public.reminders enable row level security;
create policy "reminders_read" on public.reminders for select to authenticated
  using (private.is_company_member(company_id)
         and (recipient_user_id = auth.uid() or created_by = auth.uid() or private.has_permission(company_id, 'task.view')));
create policy "reminders_write" on public.reminders for all to authenticated
  using (private.is_company_member(company_id) and (created_by = auth.uid() or private.has_permission(company_id, 'task.update')))
  with check (private.is_company_member(company_id));

-- ------------------------ ESCALATION RULES ------------------
create table public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  target_kind text not null default 'approval',
  after_hours integer not null default 24,
  level integer not null default 1,
  notify_kind public.assignee_kind not null default 'manager',
  notify_user_id uuid,
  notify_role_id uuid references public.roles(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index escalation_rules_company_idx on public.escalation_rules (company_id, target_kind, level);
grant select, insert, update, delete on public.escalation_rules to authenticated;
grant all on public.escalation_rules to service_role;
alter table public.escalation_rules enable row level security;
create policy "escalation_rules_read" on public.escalation_rules for select to authenticated
  using (private.has_permission(company_id, 'automation.view'));
create policy "escalation_rules_write" on public.escalation_rules for all to authenticated
  using (private.has_permission(company_id, 'automation.manage'))
  with check (private.has_permission(company_id, 'automation.manage'));

-- ------------------------ CALENDAR EVENTS -------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  description text,
  event_type public.calendar_event_type not null default 'other',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  owner_user_id uuid,
  attendees jsonb not null default '[]'::jsonb,
  related_entity_type text,
  related_entity_id uuid,
  external_source text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index calendar_events_company_idx on public.calendar_events (company_id, starts_at);
grant select, insert, update, delete on public.calendar_events to authenticated;
grant all on public.calendar_events to service_role;
alter table public.calendar_events enable row level security;
create policy "calendar_events_read" on public.calendar_events for select to authenticated
  using (private.is_company_member(company_id) and (private.has_permission(company_id, 'calendar.view') or owner_user_id = auth.uid()));
create policy "calendar_events_write" on public.calendar_events for all to authenticated
  using (private.has_permission(company_id, 'calendar.manage'))
  with check (private.has_permission(company_id, 'calendar.manage'));

-- --------------------------- TRIGGERS -----------------------
create trigger set_updated_at_tasks before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_updated_at_task_comments before update on public.task_comments for each row execute function public.set_updated_at();
create trigger set_updated_at_workflows before update on public.workflows for each row execute function public.set_updated_at();
create trigger set_updated_at_workflow_actions before update on public.workflow_actions for each row execute function public.set_updated_at();
create trigger set_updated_at_workflow_runs before update on public.workflow_runs for each row execute function public.set_updated_at();
create trigger set_updated_at_approval_requests before update on public.approval_requests for each row execute function public.set_updated_at();
create trigger set_updated_at_approval_steps before update on public.approval_steps for each row execute function public.set_updated_at();
create trigger set_updated_at_automation_rules before update on public.automation_rules for each row execute function public.set_updated_at();
create trigger set_updated_at_automation_runs before update on public.automation_runs for each row execute function public.set_updated_at();
create trigger set_updated_at_internal_requests before update on public.internal_requests for each row execute function public.set_updated_at();
create trigger set_updated_at_reminders before update on public.reminders for each row execute function public.set_updated_at();
create trigger set_updated_at_escalation_rules before update on public.escalation_rules for each row execute function public.set_updated_at();
create trigger set_updated_at_calendar_events before update on public.calendar_events for each row execute function public.set_updated_at();

create trigger audit_tasks after insert or update or delete on public.tasks for each row execute function public.audit_m2_change();
create trigger audit_workflows after insert or update or delete on public.workflows for each row execute function public.audit_m2_change();
create trigger audit_workflow_actions after insert or update or delete on public.workflow_actions for each row execute function public.audit_m2_change();
create trigger audit_approval_requests after insert or update or delete on public.approval_requests for each row execute function public.audit_m2_change();
create trigger audit_approval_steps after insert or update or delete on public.approval_steps for each row execute function public.audit_m2_change();
create trigger audit_automation_rules after insert or update or delete on public.automation_rules for each row execute function public.audit_m2_change();
create trigger audit_internal_requests after insert or update or delete on public.internal_requests for each row execute function public.audit_m2_change();
create trigger audit_escalation_rules after insert or update or delete on public.escalation_rules for each row execute function public.audit_m2_change();
create trigger audit_calendar_events after insert or update or delete on public.calendar_events for each row execute function public.audit_m2_change();

-- -------------------------- PERMISSIONS ---------------------
insert into public.permissions (key, module, description) values
  ('task.view',        'workflow', 'View tasks'),
  ('task.create',      'workflow', 'Create tasks'),
  ('task.update',      'workflow', 'Update tasks and comments'),
  ('task.assign',      'workflow', 'Assign or reassign tasks'),
  ('task.delete',      'workflow', 'Delete tasks'),
  ('workflow.view',    'workflow', 'View workflows and run history'),
  ('workflow.manage',  'workflow', 'Create and manage workflows'),
  ('workflow.execute', 'workflow', 'Execute and retry workflow runs'),
  ('approval.view',    'workflow', 'View approval requests'),
  ('approval.approve', 'workflow', 'Approve or reject approval requests'),
  ('approval.manage',  'workflow', 'Manage approval configuration and cancel requests'),
  ('request.view',     'workflow', 'View internal requests'),
  ('request.create',   'workflow', 'Create internal requests'),
  ('request.approve',  'workflow', 'Approve internal requests'),
  ('automation.view',  'workflow', 'View automation rules and escalations'),
  ('automation.manage','workflow', 'Create and manage automation rules and escalations'),
  ('calendar.view',    'workflow', 'View the business calendar'),
  ('calendar.manage',  'workflow', 'Create and manage calendar events')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','task.view'),('owner','task.create'),('owner','task.update'),('owner','task.assign'),('owner','task.delete'),
  ('owner','workflow.view'),('owner','workflow.manage'),('owner','workflow.execute'),
  ('owner','approval.view'),('owner','approval.approve'),('owner','approval.manage'),
  ('owner','request.view'),('owner','request.create'),('owner','request.approve'),
  ('owner','automation.view'),('owner','automation.manage'),
  ('owner','calendar.view'),('owner','calendar.manage'),
  ('admin','task.view'),('admin','task.create'),('admin','task.update'),('admin','task.assign'),('admin','task.delete'),
  ('admin','workflow.view'),('admin','workflow.manage'),('admin','workflow.execute'),
  ('admin','approval.view'),('admin','approval.approve'),('admin','approval.manage'),
  ('admin','request.view'),('admin','request.create'),('admin','request.approve'),
  ('admin','automation.view'),('admin','automation.manage'),
  ('admin','calendar.view'),('admin','calendar.manage'),
  ('manager','task.view'),('manager','task.create'),('manager','task.update'),('manager','task.assign'),
  ('manager','workflow.view'),
  ('manager','approval.view'),('manager','approval.approve'),
  ('manager','request.view'),('manager','request.create'),('manager','request.approve'),
  ('manager','automation.view'),
  ('manager','calendar.view'),('manager','calendar.manage'),
  ('staff','task.view'),('staff','task.create'),('staff','task.update'),
  ('staff','request.create'),
  ('staff','calendar.view')
) as p(role_key, key)
where r.key = p.role_key
on conflict do nothing;