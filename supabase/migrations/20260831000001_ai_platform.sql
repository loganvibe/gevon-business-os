-- AI Platform: capability configs + usage logs
-- Run this migration on the remote database via:
--   supabase db query --linked -f supabase/migrations/20260831000001_ai_platform.sql

-- ============================================================
-- Global/default AI capability configuration
-- ============================================================
create table if not exists public.ai_capability_configs (
  id uuid primary key default gen_random_uuid(),
  capability_key text not null unique,
  provider text not null default 'openrouter',
  model text not null default 'google/gemini-2.0-flash-exp:free',
  enabled boolean not null default true,
  max_tokens integer not null default 2048,
  temperature numeric not null default 0.7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Per-company AI capability overrides
-- ============================================================
create table if not exists public.ai_capability_overrides (
  id uuid primary key default gen_random_uuid(),
  capability_key text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text,
  model text,
  enabled boolean,
  max_tokens integer,
  temperature numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (capability_key, company_id)
);

-- ============================================================
-- AI usage logs (credits / tokens)
-- ============================================================
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  capability_key text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  credits_used numeric not null default 0,
  user_id uuid references auth.users(id),
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_ai_capability_overrides_company on public.ai_capability_overrides(company_id);
create index if not exists idx_ai_usage_logs_company on public.ai_usage_logs(company_id);
create index if not exists idx_ai_usage_logs_capability on public.ai_usage_logs(capability_key);
create index if not exists idx_ai_usage_logs_created on public.ai_usage_logs(created_at desc);

-- RLS
alter table public.ai_capability_configs enable row level security;
alter table public.ai_capability_overrides enable row level security;
alter table public.ai_usage_logs enable row level security;

-- Configs: readable by authenticated, writable by super_admin
create policy ai_capability_configs_select on public.ai_capability_configs for select to authenticated using (true);
create policy ai_capability_configs_write on public.ai_capability_configs for all to authenticated
  using (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'))
  with check (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));

-- Overrides: readable by company members, writable by company owners
create policy ai_capability_overrides_select on public.ai_capability_overrides for select to authenticated
  using (exists (
    select 1 from public.company_members cm
    where cm.company_id = ai_capability_overrides.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ));
create policy ai_capability_overrides_write on public.ai_capability_overrides for all to authenticated
  using (exists (
    select 1 from public.company_members cm
    join public.roles r on r.id = cm.role_id
    where cm.company_id = ai_capability_overrides.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and r.key = 'owner'
  ))
  with check (exists (
    select 1 from public.company_members cm
    join public.roles r on r.id = cm.role_id
    where cm.company_id = ai_capability_overrides.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and r.key = 'owner'
  ));

-- Usage logs: readable by company members, insert by server
create policy ai_usage_logs_select on public.ai_usage_logs for select to authenticated
  using (company_id is null or exists (
    select 1 from public.company_members cm
    where cm.company_id = ai_usage_logs.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ));

-- Seed default configs for all declared capabilities
insert into public.ai_capability_configs (capability_key, provider, model, enabled)
values
  ('core.summarize_audit', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('sales.sales_forecast', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('sales.customer_purchase_patterns', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('sales.product_recommendations', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('sales.sales_trend_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('inventory.inventory_prediction', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('inventory.low_stock_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('inventory.product_profit_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('inventory.supplier_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('expenses.spend_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('expenses.cost_reduction', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('expenses.cashflow_forecast', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('people.attendance_insights', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('people.shift_optimization', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('people.payroll_review', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('people.candidate_screening', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('workflow.workflow_suggestions', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('workflow.task_prioritization', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('workflow.approval_risk_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('workflow.automation_recommendations', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('commerce.commerce_sales_prediction', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('commerce.product_recommendations', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('commerce.order_demand_prediction', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('commerce.customer_purchase_recommendations', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('commerce.delivery_time_prediction', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('enterprise.branch_performance_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('enterprise.supplier_risk_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('enterprise.procurement_optimization', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('enterprise.asset_maintenance_prediction', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('enterprise.fleet_cost_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('enterprise.warehouse_optimization', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('integration.integration_error_analysis', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('integration.data_import_mapping', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('integration.sync_anomaly_detection', 'openrouter', 'google/gemini-2.0-flash-exp:free', true),
  ('integration.integration_recommendations', 'openrouter', 'google/gemini-2.0-flash-exp:free', true)
on conflict (capability_key) do nothing;
