
-- =========================================================================
-- Gevon Core M1: Identity & Tenancy
-- =========================================================================

create schema if not exists private;
create schema if not exists audit;

-- =========================================================================
-- Shared helpers
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- =========================================================================
-- LOOKUPS
-- =========================================================================
create table public.countries (
  code text primary key,
  name text not null,
  dial_code text,
  default_currency text
);
grant select on public.countries to anon, authenticated;
grant all on public.countries to service_role;
alter table public.countries enable row level security;
create policy countries_read_all on public.countries for select to anon, authenticated using (true);

create table public.currencies (
  code text primary key,
  name text not null,
  symbol text,
  decimals int not null default 2
);
grant select on public.currencies to anon, authenticated;
grant all on public.currencies to service_role;
alter table public.currencies enable row level security;
create policy currencies_read_all on public.currencies for select to anon, authenticated using (true);

create table public.locales (
  code text primary key,
  name text not null
);
grant select on public.locales to anon, authenticated;
grant all on public.locales to service_role;
alter table public.locales enable row level security;
create policy locales_read_all on public.locales for select to anon, authenticated using (true);

create table public.timezones (
  name text primary key
);
grant select on public.timezones to anon, authenticated;
grant all on public.timezones to service_role;
alter table public.timezones enable row level security;
create policy timezones_read_all on public.timezones for select to anon, authenticated using (true);

-- Seed lookups (starter set — extensible via UI later)
insert into public.currencies(code,name,symbol,decimals) values
 ('NGN','Nigerian Naira','₦',2),('USD','US Dollar','$',2),('EUR','Euro','€',2),
 ('GBP','Pound Sterling','£',2),('GHS','Ghanaian Cedi','₵',2),('KES','Kenyan Shilling','KSh',2),
 ('ZAR','South African Rand','R',2),('XOF','West African CFA','CFA',0),('XAF','Central African CFA','FCFA',0),
 ('EGP','Egyptian Pound','E£',2),('RWF','Rwandan Franc','FRw',0),('UGX','Ugandan Shilling','USh',0),
 ('TZS','Tanzanian Shilling','TSh',2),('MAD','Moroccan Dirham','د.م.',2);

insert into public.countries(code,name,dial_code,default_currency) values
 ('NG','Nigeria','+234','NGN'),('GH','Ghana','+233','GHS'),('KE','Kenya','+254','KES'),
 ('ZA','South Africa','+27','ZAR'),('EG','Egypt','+20','EGP'),('MA','Morocco','+212','MAD'),
 ('RW','Rwanda','+250','RWF'),('UG','Uganda','+256','UGX'),('TZ','Tanzania','+255','TZS'),
 ('CI','Côte d''Ivoire','+225','XOF'),('SN','Senegal','+221','XOF'),('CM','Cameroon','+237','XAF'),
 ('US','United States','+1','USD'),('GB','United Kingdom','+44','GBP');

insert into public.locales(code,name) values
 ('en','English'),('fr','Français'),('ar','العربية'),('sw','Kiswahili'),('ha','Hausa'),('yo','Yorùbá'),('ig','Igbo'),('pt','Português');

insert into public.timezones(name) values
 ('Africa/Lagos'),('Africa/Accra'),('Africa/Nairobi'),('Africa/Johannesburg'),
 ('Africa/Cairo'),('Africa/Casablanca'),('Africa/Kigali'),('Africa/Kampala'),
 ('Africa/Dar_es_Salaam'),('Africa/Abidjan'),('Africa/Dakar'),('Africa/Douala'),
 ('UTC'),('America/New_York'),('Europe/London');

-- =========================================================================
-- PROFILES
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_company_id uuid,
  locale text references public.locales(code) default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- COMPANIES
-- =========================================================================
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country_code text not null references public.countries(code),
  currency_code text not null references public.currencies(code),
  timezone text not null references public.timezones(name),
  locale text not null references public.locales(code) default 'en',
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();

-- Add FK to profiles.default_company_id now that companies exists
alter table public.profiles
  add constraint profiles_default_company_fk
  foreign key (default_company_id) references public.companies(id) on delete set null;

-- =========================================================================
-- BRANCHES
-- =========================================================================
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  country_code text references public.countries(code),
  currency_code text references public.currencies(code),
  timezone text references public.timezones(name),
  is_headquarters boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code)
);
create unique index branches_one_hq_per_company on public.branches(company_id) where is_headquarters = true;
grant select, insert, update, delete on public.branches to authenticated;
grant all on public.branches to service_role;
alter table public.branches enable row level security;
create trigger branches_set_updated_at before update on public.branches for each row execute function public.set_updated_at();

-- =========================================================================
-- RBAC: permissions, roles, role_permissions
-- =========================================================================
create table public.permissions (
  key text primary key,
  module text not null,
  description text not null
);
grant select on public.permissions to authenticated;
grant all on public.permissions to service_role;
alter table public.permissions enable row level security;
create policy permissions_read_all on public.permissions for select to authenticated using (true);

insert into public.permissions(key, module, description) values
  ('company.read','company','View company settings'),
  ('company.write','company','Edit company settings'),
  ('branches.read','branches','View branches'),
  ('branches.write','branches','Create, edit, archive branches'),
  ('members.read','members','View team members and invites'),
  ('members.invite','members','Invite new members'),
  ('members.manage','members','Change member roles, disable, reactivate'),
  ('roles.read','roles','View roles and permissions'),
  ('roles.manage','roles','Create, edit, delete custom roles and permission assignments'),
  ('audit.read','audit','View the audit log'),
  ('billing.read','billing','View billing information'),
  ('billing.manage','billing','Manage subscription and billing');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade, -- null = system template
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, key)
);
create unique index roles_system_key_unique on public.roles(key) where company_id is null;
grant select, insert, update, delete on public.roles to authenticated;
grant all on public.roles to service_role;
alter table public.roles enable row level security;
create trigger roles_set_updated_at before update on public.roles for each row execute function public.set_updated_at();

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);
grant select, insert, delete on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;

-- Seed system role templates (company_id = null)
insert into public.roles(company_id, key, name, description, is_system) values
  (null,'owner','Owner','Full access to everything in the company. Cannot be removed if last owner.', true),
  (null,'admin','Administrator','Manages team, roles, branches, settings.', true),
  (null,'manager','Manager','Operational access across modules.', true),
  (null,'staff','Staff','Standard staff access.', true),
  (null,'viewer','Viewer','Read-only access.', true);

-- Assign permissions to system role templates
insert into public.role_permissions(role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.company_id is null and r.key = 'owner';

insert into public.role_permissions(role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.company_id is null and r.key = 'admin'
  and p.key <> 'billing.manage';

insert into public.role_permissions(role_id, permission_key)
select r.id, unnest(array['company.read','branches.read','branches.write','members.read','members.invite','roles.read','audit.read'])
from public.roles r where r.company_id is null and r.key = 'manager';

insert into public.role_permissions(role_id, permission_key)
select r.id, unnest(array['company.read','branches.read','members.read'])
from public.roles r where r.company_id is null and r.key = 'staff';

insert into public.role_permissions(role_id, permission_key)
select r.id, unnest(array['company.read','branches.read','members.read'])
from public.roles r where r.company_id is null and r.key = 'viewer';

-- =========================================================================
-- MEMBERSHIP + MEMBER ROLES
-- =========================================================================
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','invited','disabled')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);
grant select, insert, update, delete on public.company_members to authenticated;
grant all on public.company_members to service_role;
alter table public.company_members enable row level security;
create trigger company_members_set_updated_at before update on public.company_members for each row execute function public.set_updated_at();

create table public.member_roles (
  member_id uuid not null references public.company_members(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (member_id, role_id)
);
grant select, insert, delete on public.member_roles to authenticated;
grant all on public.member_roles to service_role;
alter table public.member_roles enable row level security;

-- =========================================================================
-- INVITES
-- =========================================================================
create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.company_invites to authenticated;
grant all on public.company_invites to service_role;
alter table public.company_invites enable row level security;

-- =========================================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================================
create or replace function private.is_company_member(_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.company_members
    where company_id = _company and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function private.has_permission(_company uuid, _perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.company_members cm
    join public.member_roles mr on mr.member_id = cm.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where cm.company_id = _company
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and rp.permission_key = _perm
  );
$$;

create or replace function private.current_member_id(_company uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.company_members
  where company_id = _company and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- =========================================================================
-- RLS POLICIES (tenant tables)
-- =========================================================================

-- companies: members can read; write requires company.write; anyone authenticated can insert (become creator)
create policy companies_member_select on public.companies for select to authenticated
  using (private.is_company_member(id));
create policy companies_insert_any on public.companies for insert to authenticated
  with check (created_by = auth.uid());
create policy companies_update_perm on public.companies for update to authenticated
  using (private.has_permission(id, 'company.write'))
  with check (private.has_permission(id, 'company.write'));

-- branches
create policy branches_select on public.branches for select to authenticated
  using (private.is_company_member(company_id));
create policy branches_write on public.branches for all to authenticated
  using (private.has_permission(company_id, 'branches.write'))
  with check (private.has_permission(company_id, 'branches.write'));

-- company_members: members can see roster; manage requires members.manage; users can always see their own row
create policy members_read on public.company_members for select to authenticated
  using (user_id = auth.uid() or private.has_permission(company_id, 'members.read'));
create policy members_manage on public.company_members for all to authenticated
  using (private.has_permission(company_id, 'members.manage'))
  with check (private.has_permission(company_id, 'members.manage'));

-- member_roles: readable by members with roles.read; writable by members.manage
create policy member_roles_read on public.member_roles for select to authenticated
  using (exists(
    select 1 from public.company_members cm
    where cm.id = member_roles.member_id
      and (cm.user_id = auth.uid() or private.has_permission(cm.company_id, 'roles.read'))
  ));
create policy member_roles_write on public.member_roles for all to authenticated
  using (exists(
    select 1 from public.company_members cm
    where cm.id = member_roles.member_id
      and private.has_permission(cm.company_id, 'members.manage')
  ))
  with check (exists(
    select 1 from public.company_members cm
    where cm.id = member_roles.member_id
      and private.has_permission(cm.company_id, 'members.manage')
  ));

-- roles: system templates readable by all authenticated; company roles readable by members; write requires roles.manage
create policy roles_read on public.roles for select to authenticated
  using (company_id is null or private.is_company_member(company_id));
create policy roles_write on public.roles for all to authenticated
  using (company_id is not null and private.has_permission(company_id, 'roles.manage') and is_system = false)
  with check (company_id is not null and private.has_permission(company_id, 'roles.manage') and is_system = false);

-- role_permissions: readable when parent role is readable; writable when parent company allows roles.manage on non-system role
create policy role_permissions_read on public.role_permissions for select to authenticated
  using (exists(
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and (r.company_id is null or private.is_company_member(r.company_id))
  ));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (exists(
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and r.company_id is not null and r.is_system = false
      and private.has_permission(r.company_id, 'roles.manage')
  ))
  with check (exists(
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and r.company_id is not null and r.is_system = false
      and private.has_permission(r.company_id, 'roles.manage')
  ));

-- invites: readable by members.read; writable by members.invite
create policy invites_read on public.company_invites for select to authenticated
  using (private.has_permission(company_id, 'members.read'));
create policy invites_write on public.company_invites for all to authenticated
  using (private.has_permission(company_id, 'members.invite'))
  with check (private.has_permission(company_id, 'members.invite'));

-- =========================================================================
-- AUDIT LOG (append-only)
-- =========================================================================
create table audit.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_company_created_idx on audit.audit_logs(company_id, created_at desc);
grant usage on schema audit to authenticated, service_role;
grant select, insert on audit.audit_logs to authenticated;
grant all on audit.audit_logs to service_role;
alter table audit.audit_logs enable row level security;
-- Only members with audit.read may SELECT; only server can insert via service role (no insert policy for authenticated)
create policy audit_read on audit.audit_logs for select to authenticated
  using (company_id is not null and private.has_permission(company_id, 'audit.read'));
-- Deliberately NO insert/update/delete policies for authenticated → append-only via service role

-- =========================================================================
-- COMPANY BOOTSTRAP TRIGGER
-- Auto-provision: owner role clone, membership, owner role assignment, HQ branch
-- =========================================================================
create or replace function public.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_role_id uuid;
  v_member_id uuid;
  v_perm text;
begin
  -- Clone system roles into this company
  insert into public.roles(company_id, key, name, description, is_system)
  select new.id, r.key, r.name, r.description, true
  from public.roles r where r.company_id is null;

  -- Copy permission assignments from templates
  insert into public.role_permissions(role_id, permission_key)
  select new_r.id, rp.permission_key
  from public.roles new_r
  join public.roles tmpl on tmpl.company_id is null and tmpl.key = new_r.key
  join public.role_permissions rp on rp.role_id = tmpl.id
  where new_r.company_id = new.id;

  select id into v_owner_role_id from public.roles where company_id = new.id and key = 'owner';

  -- Membership for creator
  insert into public.company_members(company_id, user_id, status)
  values (new.id, new.created_by, 'active')
  returning id into v_member_id;

  insert into public.member_roles(member_id, role_id) values (v_member_id, v_owner_role_id);

  -- Default HQ branch
  insert into public.branches(company_id, name, code, country_code, currency_code, timezone, is_headquarters)
  values (new.id, 'Headquarters', 'HQ', new.country_code, new.currency_code, new.timezone, true);

  -- Set as user's default company if they don't have one
  update public.profiles set default_company_id = new.id
  where id = new.created_by and default_company_id is null;

  return new;
end;
$$;
create trigger on_company_created after insert on public.companies
  for each row execute function public.handle_new_company();

-- =========================================================================
-- Owner-safety trigger: cannot remove last owner
-- =========================================================================
create or replace function public.protect_last_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_role_key text;
  v_active_owners int;
begin
  if tg_op = 'DELETE' then
    select r.key, cm.company_id into v_role_key, v_company
    from public.roles r
    join public.company_members cm on cm.id = old.member_id
    where r.id = old.role_id;

    if v_role_key = 'owner' then
      select count(*) into v_active_owners
      from public.member_roles mr
      join public.roles r on r.id = mr.role_id
      join public.company_members cm on cm.id = mr.member_id
      where cm.company_id = v_company and r.key = 'owner' and cm.status = 'active';
      if v_active_owners <= 1 then
        raise exception 'Cannot remove the last active owner of a company';
      end if;
    end if;
  end if;
  return old;
end;
$$;
create trigger member_roles_protect_last_owner before delete on public.member_roles
  for each row execute function public.protect_last_owner();
