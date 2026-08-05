-- ============================================================
-- MILESTONE 9 — BUSINESS INTELLIGENCE & AI DECISION ENGINE
-- ============================================================

create type public.report_type as enum (
  'sales','inventory','expenses','employees','customers','purchases','suppliers','branches','finance'
);
create type public.report_period as enum ('daily','weekly','monthly','yearly','custom');
create type public.report_status as enum ('queued','running','completed','failed');
create type public.goal_type as enum ('revenue','expense_limit','sales_count','inventory','branch','custom');
create type public.goal_status as enum ('active','achieved','missed','cancelled');
create type public.alert_severity as enum ('info','warning','critical');
create type public.alert_status as enum ('open','acknowledged','resolved','dismissed');
create type public.recommendation_status as enum ('new','viewed','accepted','dismissed','done');
create type public.forecast_kind as enum ('sales','inventory','expense','cashflow','demand');
create type public.health_area as enum ('overall','sales','inventory','expenses','cashflow','staff','customers','growth');

-- ============ business_health_scores ============
create table public.business_health_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  captured_at timestamptz not null default now(),
  overall_score numeric(6,2) not null default 0 check (overall_score >= 0 and overall_score <= 100),
  grade text not null default 'C',
  areas jsonb not null default '{}'::jsonb,
  factors jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bhs_company_captured_idx on public.business_health_scores (company_id, captured_at desc);
grant select, insert, update, delete on public.business_health_scores to authenticated;
grant all on public.business_health_scores to service_role;
alter table public.business_health_scores enable row level security;
create policy "bhs_read" on public.business_health_scores
  for select to authenticated using (private.is_company_member(company_id));
create policy "bhs_write" on public.business_health_scores
  for all to authenticated
  using (private.has_permission(company_id, 'bi.manage'))
  with check (private.has_permission(company_id, 'bi.manage'));

-- ============ reports ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  report_type public.report_type not null,
  period public.report_period not null default 'monthly',
  period_start date not null,
  period_end date not null,
  status public.report_status not null default 'completed',
  filters jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  summary text,
  row_count integer not null default 0,
  error text,
  generated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_company_type_idx on public.reports (company_id, report_type, created_at desc);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports_read" on public.reports
  for select to authenticated using (private.is_company_member(company_id));
create policy "reports_write" on public.reports
  for all to authenticated
  using (private.has_permission(company_id, 'bi.reports.run'))
  with check (private.has_permission(company_id, 'bi.reports.run'));

-- ============ saved_reports ============
create table public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  report_type public.report_type not null,
  period public.report_period not null default 'monthly',
  filters jsonb not null default '{}'::jsonb,
  schedule_cron text,
  is_shared boolean not null default true,
  owner_user_id uuid,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index saved_reports_company_idx on public.saved_reports (company_id) where deleted_at is null;
grant select, insert, update, delete on public.saved_reports to authenticated;
grant all on public.saved_reports to service_role;
alter table public.saved_reports enable row level security;
create policy "saved_reports_read" on public.saved_reports
  for select to authenticated using (private.is_company_member(company_id));
create policy "saved_reports_write" on public.saved_reports
  for all to authenticated
  using (private.has_permission(company_id, 'bi.reports.run'))
  with check (private.has_permission(company_id, 'bi.reports.run'));

-- ============ dashboard_widgets ============
create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid,
  widget_key text not null,
  module_id text,
  title text,
  position integer not null default 0,
  size text not null default 'md',
  is_visible boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index dashboard_widgets_uidx
  on public.dashboard_widgets (company_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), widget_key);
grant select, insert, update, delete on public.dashboard_widgets to authenticated;
grant all on public.dashboard_widgets to service_role;
alter table public.dashboard_widgets enable row level security;
create policy "dashboard_widgets_read" on public.dashboard_widgets
  for select to authenticated using (private.is_company_member(company_id));
create policy "dashboard_widgets_write" on public.dashboard_widgets
  for all to authenticated
  using (private.is_company_member(company_id) and (user_id is null or user_id = auth.uid()))
  with check (private.is_company_member(company_id) and (user_id is null or user_id = auth.uid()));

-- ============ kpis ============
create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  kpi_key text not null,
  label text not null,
  unit text not null default 'currency',
  period public.report_period not null default 'monthly',
  period_start date not null,
  period_end date not null,
  value numeric(20,4) not null default 0,
  previous_value numeric(20,4),
  change_percent numeric(10,2),
  trend text not null default 'flat',
  meta jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index kpis_uidx on public.kpis
  (company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), kpi_key, period, period_start);
create index kpis_company_idx on public.kpis (company_id, computed_at desc);
grant select, insert, update, delete on public.kpis to authenticated;
grant all on public.kpis to service_role;
alter table public.kpis enable row level security;
create policy "kpis_read" on public.kpis
  for select to authenticated using (private.is_company_member(company_id));
create policy "kpis_write" on public.kpis
  for all to authenticated
  using (private.has_permission(company_id, 'bi.manage'))
  with check (private.has_permission(company_id, 'bi.manage'));

-- ============ goals ============
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  goal_type public.goal_type not null default 'revenue',
  metric_key text not null default 'revenue',
  target_value numeric(20,4) not null check (target_value >= 0),
  current_value numeric(20,4) not null default 0,
  progress_percent numeric(6,2) not null default 0,
  direction text not null default 'at_least',
  period public.report_period not null default 'monthly',
  starts_on date not null,
  ends_on date not null,
  status public.goal_status not null default 'active',
  achieved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index goals_company_status_idx on public.goals (company_id, status) where deleted_at is null;
grant select, insert, update, delete on public.goals to authenticated;
grant all on public.goals to service_role;
alter table public.goals enable row level security;
create policy "goals_read" on public.goals
  for select to authenticated using (private.is_company_member(company_id));
create policy "goals_write" on public.goals
  for all to authenticated
  using (private.has_permission(company_id, 'bi.goals.manage'))
  with check (private.has_permission(company_id, 'bi.goals.manage'));

-- ============ goal_progress ============
create table public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  value numeric(20,4) not null default 0,
  progress_percent numeric(6,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create index goal_progress_goal_idx on public.goal_progress (goal_id, recorded_at desc);
grant select, insert, update, delete on public.goal_progress to authenticated;
grant all on public.goal_progress to service_role;
alter table public.goal_progress enable row level security;
create policy "goal_progress_read" on public.goal_progress
  for select to authenticated using (private.is_company_member(company_id));
create policy "goal_progress_write" on public.goal_progress
  for all to authenticated
  using (private.has_permission(company_id, 'bi.goals.manage'))
  with check (private.has_permission(company_id, 'bi.goals.manage'));

-- ============ alerts ============
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  alert_key text not null,
  module_id text,
  severity public.alert_severity not null default 'info',
  status public.alert_status not null default 'open',
  title text not null,
  message text not null,
  deep_link text,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index alerts_dedupe_uidx on public.alerts (company_id, dedupe_key)
  where dedupe_key is not null and status = 'open';
create index alerts_company_status_idx on public.alerts (company_id, status, created_at desc);
grant select, insert, update, delete on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "alerts_read" on public.alerts
  for select to authenticated using (private.is_company_member(company_id));
create policy "alerts_write" on public.alerts
  for all to authenticated
  using (private.has_permission(company_id, 'bi.alerts.manage'))
  with check (private.has_permission(company_id, 'bi.alerts.manage'));

-- ============ advisor_recommendations ============
create table public.advisor_recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  rule_key text not null,
  module_id text,
  title text not null,
  finding text not null,
  recommendation text not null,
  impact text not null default 'medium',
  confidence numeric(5,2) not null default 60,
  severity public.alert_severity not null default 'info',
  status public.recommendation_status not null default 'new',
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index advisor_dedupe_uidx on public.advisor_recommendations (company_id, dedupe_key)
  where dedupe_key is not null and status in ('new','viewed');
create index advisor_company_idx on public.advisor_recommendations (company_id, status, generated_at desc);
grant select, insert, update, delete on public.advisor_recommendations to authenticated;
grant all on public.advisor_recommendations to service_role;
alter table public.advisor_recommendations enable row level security;
create policy "advisor_read" on public.advisor_recommendations
  for select to authenticated using (private.is_company_member(company_id));
create policy "advisor_write" on public.advisor_recommendations
  for all to authenticated
  using (private.has_permission(company_id, 'bi.manage'))
  with check (private.has_permission(company_id, 'bi.manage'));

-- ============ forecast_snapshots ============
create table public.forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  kind public.forecast_kind not null,
  method text not null default 'moving_average',
  horizon_days integer not null default 30,
  basis_start date not null,
  basis_end date not null,
  points jsonb not null default '[]'::jsonb,
  projected_total numeric(20,4) not null default 0,
  confidence numeric(5,2) not null default 50,
  meta jsonb not null default '{}'::jsonb,
  generated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forecast_company_kind_idx on public.forecast_snapshots (company_id, kind, created_at desc);
grant select, insert, update, delete on public.forecast_snapshots to authenticated;
grant all on public.forecast_snapshots to service_role;
alter table public.forecast_snapshots enable row level security;
create policy "forecast_read" on public.forecast_snapshots
  for select to authenticated using (private.is_company_member(company_id));
create policy "forecast_write" on public.forecast_snapshots
  for all to authenticated
  using (private.has_permission(company_id, 'bi.manage'))
  with check (private.has_permission(company_id, 'bi.manage'));

-- ============ GOAL PROGRESS AUTOMATION ============
create or replace function public.on_goal_progress_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.goals g
  set current_value = new.value,
      progress_percent = new.progress_percent,
      status = case
        when g.status = 'active' and g.direction = 'at_least' and new.value >= g.target_value then 'achieved'::public.goal_status
        when g.status = 'active' and g.direction = 'at_most' and now()::date > g.ends_on and new.value <= g.target_value then 'achieved'::public.goal_status
        else g.status
      end,
      achieved_at = case
        when g.achieved_at is null and g.direction = 'at_least' and new.value >= g.target_value then now()
        else g.achieved_at
      end,
      updated_at = now()
  where g.id = new.goal_id;
  return new;
end;
$$;
create trigger on_goal_progress_change_trg after insert on public.goal_progress
  for each row execute function public.on_goal_progress_change();

-- ============ UPDATED_AT ============
create trigger set_updated_at_business_health_scores before update on public.business_health_scores
  for each row execute function public.set_updated_at();
create trigger set_updated_at_reports before update on public.reports
  for each row execute function public.set_updated_at();
create trigger set_updated_at_saved_reports before update on public.saved_reports
  for each row execute function public.set_updated_at();
create trigger set_updated_at_dashboard_widgets before update on public.dashboard_widgets
  for each row execute function public.set_updated_at();
create trigger set_updated_at_kpis before update on public.kpis
  for each row execute function public.set_updated_at();
create trigger set_updated_at_goals before update on public.goals
  for each row execute function public.set_updated_at();
create trigger set_updated_at_alerts before update on public.alerts
  for each row execute function public.set_updated_at();
create trigger set_updated_at_advisor before update on public.advisor_recommendations
  for each row execute function public.set_updated_at();
create trigger set_updated_at_forecast before update on public.forecast_snapshots
  for each row execute function public.set_updated_at();

-- ============ AUDIT ============
create trigger audit_saved_reports after insert or update or delete on public.saved_reports
  for each row execute function public.audit_m2_change();
create trigger audit_goals after insert or update or delete on public.goals
  for each row execute function public.audit_m2_change();
create trigger audit_alerts after insert or update or delete on public.alerts
  for each row execute function public.audit_m2_change();
create trigger audit_advisor after insert or update or delete on public.advisor_recommendations
  for each row execute function public.audit_m2_change();
create trigger audit_business_health_scores after insert or update or delete on public.business_health_scores
  for each row execute function public.audit_m2_change();

-- ============ PERMISSIONS ============
insert into public.permissions (key, module, description) values
  ('bi.view',          'intelligence', 'View dashboards, reports, KPIs and business health'),
  ('bi.manage',        'intelligence', 'Refresh KPIs, health scores, forecasts and recommendations'),
  ('bi.reports.run',   'intelligence', 'Generate and save reports'),
  ('bi.goals.manage',  'intelligence', 'Create and manage business goals'),
  ('bi.alerts.manage', 'intelligence', 'Manage and resolve smart alerts')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','bi.view'),('owner','bi.manage'),('owner','bi.reports.run'),('owner','bi.goals.manage'),('owner','bi.alerts.manage'),
  ('admin','bi.view'),('admin','bi.manage'),('admin','bi.reports.run'),('admin','bi.goals.manage'),('admin','bi.alerts.manage'),
  ('manager','bi.view'),('manager','bi.reports.run'),('manager','bi.goals.manage'),('manager','bi.alerts.manage'),
  ('staff','bi.view')
) as p(role_key, key)
where r.key = p.role_key
on conflict do nothing;