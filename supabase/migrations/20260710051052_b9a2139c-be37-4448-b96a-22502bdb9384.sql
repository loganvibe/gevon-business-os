
-- =========================================================
-- M2: Platform administrators (Gevon staff, isolated)
-- =========================================================
create type public.platform_role as enum (
  'super_admin','support','developer','operations','finance','compliance','security','billing'
);
create type public.platform_admin_status as enum ('active','disabled');

create table public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.platform_role not null,
  status public.platform_admin_status not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;
alter table public.platform_admins enable row level security;

-- Helper schema exists from M1; extend it.
create or replace function private.is_platform_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = _uid and status = 'active'
  );
$$;

create or replace function private.platform_has_role(_uid uuid, _role public.platform_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = _uid and status = 'active' and role = _role
  );
$$;

create policy platform_admins_select on public.platform_admins for select to authenticated
  using (private.is_platform_admin(auth.uid()));
create policy platform_admins_write_super on public.platform_admins for all to authenticated
  using (private.platform_has_role(auth.uid(), 'super_admin'))
  with check (private.platform_has_role(auth.uid(), 'super_admin'));

create trigger tr_platform_admins_updated
  before update on public.platform_admins
  for each row execute function public.set_updated_at();

-- Prevent removing/demoting the last active super_admin.
create or replace function public.protect_last_super_admin()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'super_admin' and old.status = 'active' then
      select count(*) into v_count from public.platform_admins
        where role = 'super_admin' and status = 'active' and id <> old.id;
      if v_count = 0 then raise exception 'Cannot remove the last active super_admin'; end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.role = 'super_admin' and old.status = 'active'
       and (new.role <> 'super_admin' or new.status <> 'active') then
      select count(*) into v_count from public.platform_admins
        where role = 'super_admin' and status = 'active' and id <> old.id;
      if v_count = 0 then raise exception 'Cannot demote/disable the last active super_admin'; end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;
create trigger tr_platform_admins_protect
  before update or delete on public.platform_admins
  for each row execute function public.protect_last_super_admin();

-- =========================================================
-- M2: Module registry
-- =========================================================
create type public.module_status as enum ('active','deprecated','disabled_global');

create table public.modules (
  id text primary key,
  name text not null,
  description text,
  category text not null default 'general',
  icon text,
  version text not null default '0.1.0',
  subscription_tier text not null default 'starter',
  is_core boolean not null default false,
  status public.module_status not null default 'active',
  manifest_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.modules to authenticated;
grant all on public.modules to service_role;
alter table public.modules enable row level security;
create policy modules_select_all on public.modules for select to authenticated using (true);
create policy modules_write_platform on public.modules for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create trigger tr_modules_updated before update on public.modules
  for each row execute function public.set_updated_at();

create table public.module_dependencies (
  module_id text not null references public.modules(id) on delete cascade,
  depends_on_id text not null references public.modules(id) on delete restrict,
  primary key (module_id, depends_on_id),
  check (module_id <> depends_on_id)
);
grant select on public.module_dependencies to authenticated;
grant all on public.module_dependencies to service_role;
alter table public.module_dependencies enable row level security;
create policy moddeps_select on public.module_dependencies for select to authenticated using (true);
create policy moddeps_write on public.module_dependencies for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));

create table public.module_permissions (
  module_id text not null references public.modules(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (module_id, permission_key)
);
grant select on public.module_permissions to authenticated;
grant all on public.module_permissions to service_role;
alter table public.module_permissions enable row level security;
create policy modperm_select on public.module_permissions for select to authenticated using (true);
create policy modperm_write on public.module_permissions for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));

create table public.module_ai_capabilities (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, key)
);
grant select on public.module_ai_capabilities to authenticated;
grant all on public.module_ai_capabilities to service_role;
alter table public.module_ai_capabilities enable row level security;
create policy modai_select on public.module_ai_capabilities for select to authenticated using (true);
create policy modai_write on public.module_ai_capabilities for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create trigger tr_modai_updated before update on public.module_ai_capabilities
  for each row execute function public.set_updated_at();

-- =========================================================
-- M2: Feature flags
-- =========================================================
create type public.feature_flag_status as enum (
  'development','internal','beta','premium','public','disabled'
);

create table public.feature_flags (
  key text primary key,
  module_id text references public.modules(id) on delete cascade,
  name text not null,
  description text,
  default_status public.feature_flag_status not null default 'disabled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.feature_flags to authenticated;
grant all on public.feature_flags to service_role;
alter table public.feature_flags enable row level security;
create policy flags_select on public.feature_flags for select to authenticated using (true);
create policy flags_write on public.feature_flags for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create trigger tr_flags_updated before update on public.feature_flags
  for each row execute function public.set_updated_at();

create table public.feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null references public.feature_flags(key) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  status public.feature_flag_status not null,
  note text,
  set_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index feature_flag_overrides_unique
  on public.feature_flag_overrides (flag_key, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid));
grant select, insert, update, delete on public.feature_flag_overrides to authenticated;
grant all on public.feature_flag_overrides to service_role;
alter table public.feature_flag_overrides enable row level security;
create policy flago_select on public.feature_flag_overrides for select to authenticated
  using (
    company_id is null
    or private.is_company_member(company_id)
    or private.is_platform_admin(auth.uid())
  );
create policy flago_write_platform on public.feature_flag_overrides for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create policy flago_write_company on public.feature_flag_overrides for all to authenticated
  using (company_id is not null and private.has_permission(company_id, 'flags.override'))
  with check (company_id is not null and private.has_permission(company_id, 'flags.override'));
create trigger tr_flago_updated before update on public.feature_flag_overrides
  for each row execute function public.set_updated_at();

-- =========================================================
-- M2: Licensing
-- =========================================================
create type public.subscription_status as enum ('trial','active','past_due','cancelled');

create table public.plans (
  key text primary key,
  name text not null,
  description text,
  tier int not null default 0,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy plans_select on public.plans for select to authenticated using (true);
create policy plans_write on public.plans for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create trigger tr_plans_updated before update on public.plans
  for each row execute function public.set_updated_at();

create table public.plan_modules (
  plan_key text not null references public.plans(key) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  primary key (plan_key, module_id)
);
grant select on public.plan_modules to authenticated;
grant all on public.plan_modules to service_role;
alter table public.plan_modules enable row level security;
create policy planmod_select on public.plan_modules for select to authenticated using (true);
create policy planmod_write on public.plan_modules for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan_key text not null references public.plans(key),
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy subs_select on public.subscriptions for select to authenticated
  using (private.is_company_member(company_id) or private.is_platform_admin(auth.uid()));
create policy subs_write_company on public.subscriptions for all to authenticated
  using (private.has_permission(company_id, 'subscription.manage'))
  with check (private.has_permission(company_id, 'subscription.manage'));
create policy subs_write_platform on public.subscriptions for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create trigger tr_subs_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =========================================================
-- M2: Company module activation
-- =========================================================
create table public.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_id text not null references public.modules(id) on delete restrict,
  enabled_at timestamptz not null default now(),
  enabled_by uuid references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, module_id)
);
grant select, insert, update, delete on public.company_modules to authenticated;
grant all on public.company_modules to service_role;
alter table public.company_modules enable row level security;
create policy cmod_select on public.company_modules for select to authenticated
  using (private.is_company_member(company_id) or private.is_platform_admin(auth.uid()));
create policy cmod_write_company on public.company_modules for all to authenticated
  using (private.has_permission(company_id, 'modules.manage'))
  with check (private.has_permission(company_id, 'modules.manage'));
create policy cmod_write_platform on public.company_modules for all to authenticated
  using (private.is_platform_admin(auth.uid()))
  with check (private.is_platform_admin(auth.uid()));
create trigger tr_cmod_updated before update on public.company_modules
  for each row execute function public.set_updated_at();

-- Add is_internal flag to companies for "internal" feature-flag audience.
alter table public.companies add column if not exists is_internal boolean not null default false;

-- =========================================================
-- Seed permissions (M2)
-- =========================================================
insert into public.permissions (key, module, description) values
  ('modules.view',            'core',     'View module catalog and enabled modules'),
  ('modules.manage',          'core',     'Enable and disable modules for the company'),
  ('flags.override',          'core',     'Override feature flags for the company'),
  ('subscription.view',       'core',     'View company subscription and plan'),
  ('subscription.manage',     'core',     'Change company subscription and plan'),
  ('platform.admins.manage',  'platform', 'Manage platform administrators'),
  ('platform.flags.manage',   'platform', 'Manage global feature flags'),
  ('platform.modules.manage', 'platform', 'Manage the global module registry'),
  ('platform.audit.read',     'platform', 'Read global audit logs'),
  ('platform.analytics.read', 'platform', 'Read platform analytics')
on conflict (key) do nothing;

-- Attach company-side permissions to system role templates (company_id is null).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','modules.view'), ('owner','modules.manage'),
  ('owner','flags.override'),
  ('owner','subscription.view'), ('owner','subscription.manage'),
  ('admin','modules.view'), ('admin','modules.manage'),
  ('admin','flags.override'),
  ('admin','subscription.view'),
  ('manager','modules.view'),
  ('staff','modules.view'),
  ('viewer','modules.view')
) as v(role_key, perm)
join public.permissions p on p.key = v.perm
where r.company_id is null and r.key = v.role_key
on conflict do nothing;

-- Also attach to every already-cloned per-company copy of these roles.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','modules.view'), ('owner','modules.manage'),
  ('owner','flags.override'),
  ('owner','subscription.view'), ('owner','subscription.manage'),
  ('admin','modules.view'), ('admin','modules.manage'),
  ('admin','flags.override'),
  ('admin','subscription.view'),
  ('manager','modules.view'),
  ('staff','modules.view'),
  ('viewer','modules.view')
) as v(role_key, perm)
join public.permissions p on p.key = v.perm
where r.company_id is not null and r.key = v.role_key
on conflict do nothing;

-- =========================================================
-- Seed core module + plans
-- =========================================================
insert into public.modules (id, name, description, category, icon, version, subscription_tier, is_core, status)
values
  ('core', 'Gevon Core', 'Core platform: settings, users, roles, branches, audit', 'core', 'shield-check', '1.0.0', 'starter', true, 'active')
on conflict (id) do nothing;

insert into public.plans (key, name, description, tier, is_custom) values
  ('starter',      'Starter',      'Everything a small business needs to get started', 0, false),
  ('professional', 'Professional', 'For growing teams with multiple modules',           1, false),
  ('enterprise',   'Enterprise',   'For established businesses with advanced needs',    2, false),
  ('custom',       'Custom',       'Tailored plan for strategic accounts',              3, true)
on conflict (key) do nothing;

insert into public.plan_modules (plan_key, module_id)
select p.key, 'core' from public.plans p
on conflict do nothing;

-- Default every existing company to a Starter trial + enable core module.
insert into public.subscriptions (company_id, plan_key, status, trial_ends_at)
select c.id, 'starter', 'trial', now() + interval '30 days'
from public.companies c
where not exists (select 1 from public.subscriptions s where s.company_id = c.id);

insert into public.company_modules (company_id, module_id, enabled_by)
select c.id, 'core', c.created_by
from public.companies c
where not exists (
  select 1 from public.company_modules cm where cm.company_id = c.id and cm.module_id = 'core'
);

-- Extend handle_new_company to also create a starter subscription + enable core.
create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner_role_id uuid;
  v_member_id uuid;
begin
  insert into public.roles(company_id, key, name, description, is_system)
  select new.id, r.key, r.name, r.description, true
  from public.roles r where r.company_id is null;

  insert into public.role_permissions(role_id, permission_key)
  select new_r.id, rp.permission_key
  from public.roles new_r
  join public.roles tmpl on tmpl.company_id is null and tmpl.key = new_r.key
  join public.role_permissions rp on rp.role_id = tmpl.id
  where new_r.company_id = new.id;

  select id into v_owner_role_id from public.roles where company_id = new.id and key = 'owner';

  insert into public.company_members(company_id, user_id, status)
  values (new.id, new.created_by, 'active')
  returning id into v_member_id;

  insert into public.member_roles(member_id, role_id) values (v_member_id, v_owner_role_id);

  insert into public.branches(company_id, name, code, country_code, currency_code, timezone, is_headquarters)
  values (new.id, 'Headquarters', 'HQ', new.country_code, new.currency_code, new.timezone, true);

  update public.profiles set default_company_id = new.id
  where id = new.created_by and default_company_id is null;

  -- M2: Starter trial subscription
  insert into public.subscriptions (company_id, plan_key, status, trial_ends_at, created_by)
  values (new.id, 'starter', 'trial', now() + interval '30 days', new.created_by);

  -- M2: Enable core module
  insert into public.company_modules (company_id, module_id, enabled_by)
  values (new.id, 'core', new.created_by);

  return new;
end;
$function$;

-- =========================================================
-- Audit triggers for M2 tables
-- =========================================================
-- Reuse existing audit.write() helper from M1 if present; otherwise write directly.
create or replace function public.audit_m2_change()
returns trigger language plpgsql security definer set search_path = public, audit as $$
declare v_company uuid; v_entity text; v_before jsonb; v_after jsonb;
begin
  v_entity := tg_table_name;
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new); v_before := null;
    v_company := coalesce((v_after->>'company_id')::uuid, null);
  elsif tg_op = 'UPDATE' then
    v_after := to_jsonb(new); v_before := to_jsonb(old);
    v_company := coalesce((v_after->>'company_id')::uuid, (v_before->>'company_id')::uuid);
  else
    v_before := to_jsonb(old); v_after := null;
    v_company := coalesce((v_before->>'company_id')::uuid, null);
  end if;
  insert into audit.audit_logs (company_id, actor_user_id, action, entity_type, entity_id, before, after)
  values (v_company, auth.uid(), lower(tg_op), v_entity,
          coalesce((coalesce(v_after, v_before)->>'id')::uuid, null),
          v_before, v_after);
  return coalesce(new, old);
end;
$$;

create trigger tr_audit_platform_admins
  after insert or update or delete on public.platform_admins
  for each row execute function public.audit_m2_change();
create trigger tr_audit_modules
  after insert or update or delete on public.modules
  for each row execute function public.audit_m2_change();
create trigger tr_audit_flags
  after insert or update or delete on public.feature_flags
  for each row execute function public.audit_m2_change();
create trigger tr_audit_flag_overrides
  after insert or update or delete on public.feature_flag_overrides
  for each row execute function public.audit_m2_change();
create trigger tr_audit_subscriptions
  after insert or update or delete on public.subscriptions
  for each row execute function public.audit_m2_change();
create trigger tr_audit_company_modules
  after insert or update or delete on public.company_modules
  for each row execute function public.audit_m2_change();
create trigger tr_audit_plans
  after insert or update or delete on public.plans
  for each row execute function public.audit_m2_change();
