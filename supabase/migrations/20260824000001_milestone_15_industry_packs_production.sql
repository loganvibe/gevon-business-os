-- ============================================================
-- MILESTONE 15 — INDUSTRY PACKS + PRODUCTION LAUNCH
-- ============================================================

-- -------------------------- ENUMS --------------------------
do $$ begin create type public.industry_profile as enum ('retail','restaurant','pharmacy','wholesale','construction','manufacturing','service','hospitality','education','agriculture'); exception when duplicate_object then null; end $$;
do $$ begin create type public.onboarding_step as enum ('business_name','business_type','branch','business_size','operations','capabilities','workspace','import','complete'); exception when duplicate_object then null; end $$;
do $$ begin create type public.onboarding_status as enum ('not_started','in_progress','completed','skipped'); exception when duplicate_object then null; end $$;

-- -------------------- INDUSTRY PROFILES -------------------
create table public.industry_profiles (
  id uuid primary key default gen_random_uuid(),
  key public.industry_profile not null unique,
  name text not null,
  description text,
  icon text,
  recommended_modules jsonb not null default '[]'::jsonb,
  recommended_widgets jsonb not null default '[]'::jsonb,
  default_navigation jsonb not null default '[]'::jsonb,
  terminology jsonb not null default '{}'::jsonb,
  default_workflows jsonb not null default '[]'::jsonb,
  default_permissions jsonb not null default '[]'::jsonb,
  relevant_reports jsonb not null default '[]'::jsonb,
  relevant_kpis jsonb not null default '[]'::jsonb,
  relevant_events jsonb not null default '[]'::jsonb,
  relevant_ai_capabilities jsonb not null default '[]'::jsonb,
  feature_defaults jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index industry_profiles_key_idx on public.industry_profiles (key);
grant select, insert, update, delete on public.industry_profiles to authenticated;
grant all on public.industry_profiles to service_role;
alter table public.industry_profiles enable row level security;
create policy "industry_profiles_read" on public.industry_profiles for select to authenticated using (true);
create policy "industry_profiles_write" on public.industry_profiles for all to authenticated using (true) with check (true);

-- ------------------- COMPANY PROFILES ---------------------
create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  industry_key public.industry_profile not null,
  business_size text,
  primary_operations text[] default '{}',
  onboarding_status public.onboarding_status not null default 'not_started',
  onboarding_completed_at timestamptz,
  dashboard_config jsonb not null default '{}'::jsonb,
  customization jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index company_profiles_company_idx on public.company_profiles (company_id);
grant select, insert, update, delete on public.company_profiles to authenticated;
grant all on public.company_profiles to service_role;
alter table public.company_profiles enable row level security;
create policy "company_profiles_read" on public.company_profiles for select to authenticated
  using (private.has_permission(company_id, 'settings.view') or private.is_company_member(company_id));
create policy "company_profiles_write" on public.company_profiles for all to authenticated
  using (private.has_permission(company_id, 'settings.manage'))
  with check (private.has_permission(company_id, 'settings.manage'));

-- -------------------- ONBOARDING STATE --------------------
create table public.onboarding_states (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  current_step public.onboarding_step not null default 'business_name',
  completed_steps public.onboarding_step[] default '{}',
  data jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index onboarding_states_company_idx on public.onboarding_states (company_id);
grant select, insert, update, delete on public.onboarding_states to authenticated;
grant all on public.onboarding_states to service_role;
alter table public.onboarding_states enable row level security;
create policy "onboarding_states_read" on public.onboarding_states for select to authenticated
  using (private.has_permission(company_id, 'settings.view') or private.is_company_member(company_id));
create policy "onboarding_states_write" on public.onboarding_states for all to authenticated
  using (private.has_permission(company_id, 'settings.manage'))
  with check (private.has_permission(company_id, 'settings.manage'));

-- ------------------ SYSTEM HEALTH MONITOR -----------------
create table public.system_health_checks (
  id uuid primary key default gen_random_uuid(),
  check_name text not null,
  status text not null default 'healthy',
  message text,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);
create index system_health_checks_checked_idx on public.system_health_checks (checked_at desc);
grant select, insert, update, delete on public.system_health_checks to authenticated;
grant all on public.system_health_checks to service_role;
alter table public.system_health_checks enable row level security;
create policy "system_health_checks_read" on public.system_health_checks for select to authenticated using (true);
create policy "system_health_checks_write" on public.system_health_checks for all to authenticated using (true) with check (true);

-- ---------------------- TIMESTAMPS ------------------------
create trigger tr_industry_profiles_updated before update on public.industry_profiles for each row execute function public.set_updated_at();
create trigger tr_company_profiles_updated before update on public.company_profiles for each row execute function public.set_updated_at();
create trigger tr_onboarding_states_updated before update on public.onboarding_states for each row execute function public.set_updated_at();

create trigger tr_audit_industry_profiles after insert or update or delete on public.industry_profiles for each row execute function public.audit_m2_change();
create trigger tr_audit_company_profiles after insert or update or delete on public.company_profiles for each row execute function public.audit_m2_change();
create trigger tr_audit_onboarding_states after insert or update or delete on public.onboarding_states for each row execute function public.audit_m2_change();

-- ---------------------- PERMISSIONS ------------------------
insert into public.permissions (key, module, description) values
  ('industry.view', 'core', 'View industry profiles and recommendations'),
  ('onboarding.manage', 'core', 'Manage business onboarding'),
  ('system.health.view', 'core', 'View system health status')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, v.perm
from public.roles r
join (values
  ('owner','industry.view'),('owner','onboarding.manage'),('owner','system.health.view'),
  ('admin','industry.view'),('admin','onboarding.manage'),('admin','system.health.view'),
  ('manager','industry.view'),('manager','onboarding.manage'),
  ('staff','industry.view'),
  ('viewer','industry.view')
) as v(role_key, perm) on v.role_key = r.key
on conflict do nothing;

-- -------------------- SEED INDUSTRY PROFILES --------------
insert into public.industry_profiles (key, name, description, icon, recommended_modules, recommended_widgets, relevant_kpis, feature_defaults) values
('retail', 'Retail / Supermarket', 'Point of sale, inventory, purchasing, and customer loyalty for retail stores.', 'store',
 '["sales","inventory","commerce","crm","expenses","reports"]',
 '["sales.todays_sales","inventory.low_stock","commerce.open_orders","revenue.mtd"]',
 '["daily_sales","inventory_turnover","avg_basket_size","stockout_rate"]',
 '{"commerce.native_pos":"public","commerce.delivery":"disabled","commerce.online_store":"beta"}'),
('restaurant', 'Restaurant', 'Table service, kitchen orders, menu management, and reservations.', 'utensils',
 '["sales","inventory","commerce","crm","expenses","reports"]',
 '["sales.todays_sales","commerce.open_orders","inventory.low_stock","revenue.mtd"]',
 '["table_turnover","avg_order_value","reservation_fulfillment","food_cost_pct"]',
 '{"commerce.native_pos":"public","commerce.delivery":"beta","commerce.reservations":"public"}'),
('pharmacy', 'Pharmacy', 'Product inventory, expiry tracking, purchasing, and customer records.', 'pill',
 '["sales","inventory","crm","expenses","reports"]',
 '["sales.todays_sales","inventory.low_stock","inventory.expiring_soon","revenue.mtd"]',
 '["prescription_volume","expiry_risk","stockout_rate","avg_prescription_value"]',
 '{"inventory.expiry_tracking":"public"}'),
('wholesale', 'Wholesale / Distribution', 'High-volume orders, warehouse management, delivery, and supplier networks.', 'truck',
 '["sales","inventory","enterprise","crm","expenses","reports"]',
 '["sales.todays_sales","warehouse.transfers","inventory.low_stock","revenue.mtd"]',
 '["order_volume","delivery_rate","inventory_turnover","credit_outstanding"]',
 '{"commerce.delivery":"public","warehouse.enabled":"public"}'),
('construction', 'Construction', 'Project tracking, procurement, asset management, and expense control.', 'hard-hat',
 '["enterprise","inventory","expenses","projects","reports"]',
 '["project.active_count","expense.mtd","asset.utilization","procurement.pending"]',
 '["project_completion","budget_variance","asset_utilization","procurement_cycle_time"]',
 '{"projects.enabled":"public","fleet.enabled":"beta"}'),
('manufacturing', 'Manufacturing', 'Production planning, inventory, maintenance, and quality control.', 'factory',
 '["inventory","enterprise","sales","expenses","reports"]',
 '["production.output","inventory.low_stock","maintenance.open_count","revenue.mtd"]',
 '["production_efficiency","downtime","quality_pass_rate","inventory_turnover"]',
 '{"production.enabled":"public","maintenance.enabled":"public"}'),
('service', 'Service Business', 'Appointments, tasks, customers, invoicing, and team management.', 'briefcase',
 '["sales","crm","workflow","people","expenses","reports"]',
 '["sales.todays_sales","workflow.open_tasks","revenue.mtd","customer.new_count"]',
 '["booking_rate","utilization","avg_invoice_value","client_retention"]',
 '{"workflow.enabled":"public","commerce.delivery":"disabled"}'),
('hospitality', 'Hotel / Hospitality', 'Reservations, guest management, housekeeping, and revenue tracking.', 'hotel',
 '["commerce","crm","inventory","expenses","reports"]',
 '["commerce.reservations_today","revenue.mtd","occupancy_rate","inventory.low_stock"]',
 '["occupancy_rate","adr","revpar","guest_satisfaction"]',
 '{"commerce.reservations":"public","commerce.delivery":"disabled"}'),
('education', 'School / Education', 'Student records, fees, classes, communication, and academic reporting.', 'graduation-cap',
 '["people","crm","expenses","reports"]',
 '["people.active_count","revenue.mtd","tasks.open_count","communication.unread"]',
 '["enrollment_rate","fee_collection_rate","attendance_rate","performance_score"]',
 '{}'),
('agriculture', 'Agriculture', 'Farm inventory, purchasing, assets, sales, and seasonal reporting.', 'sprout',
 '["inventory","sales","enterprise","expenses","reports"]',
 '["inventory.low_stock","sales.todays_sales","asset.utilization","revenue.mtd"]',
 '["yield_per_hectare","input_cost","sales_growth","asset_utilization"]',
 '{"warehouse.enabled":"public","fleet.enabled":"beta"}')
on conflict (key) do nothing;
