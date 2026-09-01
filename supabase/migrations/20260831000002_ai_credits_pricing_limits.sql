-- AI Platform: credits, pricing, limits, adjustments
-- ============================================================

-- ============================================================
-- Centralized model pricing (admin-managed)
-- ============================================================
create table if not exists public.ai_model_pricing (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  input_price_per_1k numeric not null default 0,
  output_price_per_1k numeric not null default 0,
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, model)
);

-- ============================================================
-- Plan AI credit allocations
-- ============================================================
create table if not exists public.plan_ai_limits (
  plan_key text not null references public.plans(key) on delete cascade,
  monthly_credits numeric not null default 0,
  daily_limit integer not null default 0,
  trial_credits numeric not null default 0,
  max_tokens_per_request integer not null default 4096,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_key)
);

-- ============================================================
-- Company AI credit wallets
-- ============================================================
create table if not exists public.company_ai_credits (
  company_id uuid not null references public.companies(id) on delete cascade primary key,
  monthly_credits numeric not null default 0,
  bonus_credits numeric not null default 0,
  consumed_credits numeric not null default 0,
  period_start timestamptz not null default now(),
  period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Company AI daily usage tracking
-- ============================================================
create table if not exists public.company_ai_daily_usage (
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  tokens integer not null default 0,
  credits numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, day)
);

-- ============================================================
-- Manual credit adjustments (audit trail)
-- ============================================================
create table if not exists public.ai_credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  admin_user_id uuid references auth.users(id),
  adjustment_type text not null,
  amount numeric not null,
  previous_monthly_credits numeric,
  new_monthly_credits numeric,
  previous_bonus_credits numeric,
  new_bonus_credits numeric,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Capability-level credit costs (overrides global default)
-- ============================================================
alter table if exists public.ai_capability_configs add column if not exists credit_cost_per_1k_tokens numeric not null default 0.01;

-- ============================================================
-- Seed plan limits (configurable by admin later)
-- ============================================================
insert into public.plan_ai_limits (plan_key, monthly_credits, daily_limit, trial_credits)
values
  ('starter', 500, 50, 100),
  ('professional', 5000, 500, 500),
  ('enterprise', 50000, 5000, 2000),
  ('custom', 50000, 5000, 2000)
on conflict (plan_key) do nothing;

-- Seed model pricing (update via admin later)
insert into public.ai_model_pricing (provider, model, input_price_per_1k, output_price_per_1k)
values
  ('openrouter', 'google/gemini-2.0-flash-exp:free', 0, 0),
  ('openrouter', 'openai/gpt-4o-mini', 0.00015, 0.0006),
  ('openrouter', 'anthropic/claude-3.5-haiku', 0.0008, 0.004),
  ('openrouter', 'meta-llama/llama-4-maverick', 0.00015, 0.0006),
  ('openrouter', 'deepseek/deepseek-chat', 0.0001, 0.0004)
on conflict (provider, model) do nothing;

-- RLS
alter table public.ai_model_pricing enable row level security;
alter table public.plan_ai_limits enable row level security;
alter table public.company_ai_credits enable row level security;
alter table public.company_ai_daily_usage enable row level security;
alter table public.ai_credit_adjustments enable row level security;

create policy ai_model_pricing_select on public.ai_model_pricing for select to authenticated using (true);
create policy ai_model_pricing_write on public.ai_model_pricing for all to authenticated
  using (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'))
  with check (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));

create policy plan_ai_limits_select on public.plan_ai_limits for select to authenticated using (true);
create policy plan_ai_limits_write on public.plan_ai_limits for all to authenticated
  using (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'))
  with check (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));

create policy company_ai_credits_select on public.company_ai_credits for select to authenticated
  using (exists (select 1 from public.company_members cm where cm.company_id = company_ai_credits.company_id and cm.user_id = auth.uid() and cm.status = 'active')
    or exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));
create policy company_ai_credits_write on public.company_ai_credits for all to authenticated
  using (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'))
  with check (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));

create policy company_ai_daily_usage_select on public.company_ai_daily_usage for select to authenticated
  using (exists (select 1 from public.company_members cm where cm.company_id = company_ai_daily_usage.company_id and cm.user_id = auth.uid() and cm.status = 'active')
    or exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));

create policy ai_credit_adjustments_select on public.ai_credit_adjustments for select to authenticated
  using (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));
create policy ai_credit_adjustments_insert on public.ai_credit_adjustments for insert to authenticated
  with check (exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'super_admin' and status = 'active'));
