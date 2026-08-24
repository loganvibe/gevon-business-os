-- ============================================================
-- MILESTONE 13 — ENTERPRISE OPERATIONS ENGINE
-- ============================================================

-- ---------------------------- ENUMS -------------------------
do $$ begin create type public.warehouse_status as enum ('active','inactive','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.transfer_status as enum ('pending','in_transit','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.purchase_request_status as enum ('draft','submitted','approved','rejected','converted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.purchase_order_status as enum ('draft','sent','confirmed','partially_received','received','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.vendor_status as enum ('active','inactive','blacklisted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.asset_status as enum ('active','maintenance','damaged','lost','retired','disposed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.asset_category_type as enum ('fixed','it','vehicle','furniture','equipment','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.maintenance_status as enum ('open','scheduled','in_progress','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.maintenance_type as enum ('preventive','corrective','emergency','inspection'); exception when duplicate_object then null; end $$;
do $$ begin create type public.vehicle_status as enum ('active','maintenance','inactive','retired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.enterprise_document_type as enum ('vendor','asset','vehicle','warehouse','branch','purchase_order','employee','other'); exception when duplicate_object then null; end $$;

-- -------------------------- WAREHOUSES ----------------------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  code text,
  address text,
  status public.warehouse_status not null default 'active',
  manager_user_id uuid,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code)
);
create index warehouses_company_idx on public.warehouses (company_id, status);
grant select, insert, update, delete on public.warehouses to authenticated;
grant all on public.warehouses to service_role;
alter table public.warehouses enable row level security;
create policy "warehouses_read" on public.warehouses for select to authenticated
  using (private.has_permission(company_id, 'warehouse.view') or private.is_company_member(company_id));
create policy "warehouses_write" on public.warehouses for all to authenticated
  using (private.has_permission(company_id, 'warehouse.manage'))
  with check (private.has_permission(company_id, 'warehouse.manage'));

-- --------------------- WAREHOUSE LOCATIONS ------------------
create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  code text,
  location_type text not null default 'general',
  capacity numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index warehouse_locations_warehouse_idx on public.warehouse_locations (warehouse_id);
grant select, insert, update, delete on public.warehouse_locations to authenticated;
grant all on public.warehouse_locations to service_role;
alter table public.warehouse_locations enable row level security;
create policy "warehouse_locations_read" on public.warehouse_locations for select to authenticated
  using (exists (select 1 from public.warehouses w where w.id = warehouse_id and (private.has_permission(w.company_id, 'warehouse.view') or private.is_company_member(w.company_id))));
create policy "warehouse_locations_write" on public.warehouse_locations for all to authenticated
  using (exists (select 1 from public.warehouses w where w.id = warehouse_id and private.has_permission(w.company_id, 'warehouse.manage')))
  with check (exists (select 1 from public.warehouses w where w.id = warehouse_id and private.has_permission(w.company_id, 'warehouse.manage')));

-- -------------------- WAREHOUSE TRANSFERS -------------------
create table public.warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  transfer_number text not null,
  from_branch_id uuid references public.branches(id) on delete set null,
  from_warehouse_id uuid references public.warehouses(id) on delete set null,
  to_branch_id uuid references public.branches(id) on delete set null,
  to_warehouse_id uuid references public.warehouses(id) on delete set null,
  status public.transfer_status not null default 'pending',
  notes text,
  requested_by uuid,
  approved_by uuid,
  shipped_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, transfer_number)
);
create index warehouse_transfers_company_idx on public.warehouse_transfers (company_id, status, created_at desc);
grant select, insert, update, delete on public.warehouse_transfers to authenticated;
grant all on public.warehouse_transfers to service_role;
alter table public.warehouse_transfers enable row level security;
create policy "warehouse_transfers_read" on public.warehouse_transfers for select to authenticated
  using (private.has_permission(company_id, 'warehouse.view') or private.is_company_member(company_id));
create policy "warehouse_transfers_write" on public.warehouse_transfers for all to authenticated
  using (private.has_permission(company_id, 'warehouse.manage'))
  with check (private.has_permission(company_id, 'warehouse.manage'));

create table public.warehouse_transfer_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  transfer_id uuid not null references public.warehouse_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);
create index warehouse_transfer_items_transfer_idx on public.warehouse_transfer_items (transfer_id);
grant select, insert, update, delete on public.warehouse_transfer_items to authenticated;
grant all on public.warehouse_transfer_items to service_role;
alter table public.warehouse_transfer_items enable row level security;
create policy "warehouse_transfer_items_read" on public.warehouse_transfer_items for select to authenticated
  using (exists (select 1 from public.warehouse_transfers t where t.id = transfer_id and (private.has_permission(t.company_id, 'warehouse.view') or private.is_company_member(t.company_id))));
create policy "warehouse_transfer_items_write" on public.warehouse_transfer_items for all to authenticated
  using (exists (select 1 from public.warehouse_transfers t where t.id = transfer_id and private.has_permission(t.company_id, 'warehouse.manage')))
  with check (exists (select 1 from public.warehouse_transfers t where t.id = transfer_id and private.has_permission(t.company_id, 'warehouse.manage')));

-- --------------------- PURCHASE REQUESTS --------------------
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  request_number text not null,
  status public.purchase_request_status not null default 'draft',
  justification text,
  total_estimated numeric(14,2) not null default 0,
  requested_by uuid,
  approved_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, request_number)
);
create index purchase_requests_company_idx on public.purchase_requests (company_id, status, created_at desc);
grant select, insert, update, delete on public.purchase_requests to authenticated;
grant all on public.purchase_requests to service_role;
alter table public.purchase_requests enable row level security;
create policy "purchase_requests_read" on public.purchase_requests for select to authenticated
  using (private.has_permission(company_id, 'procurement.view') or private.is_company_member(company_id));
create policy "purchase_requests_write" on public.purchase_requests for all to authenticated
  using (private.has_permission(company_id, 'procurement.manage'))
  with check (private.has_permission(company_id, 'procurement.manage'));

create table public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  estimated_unit_cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index purchase_request_items_request_idx on public.purchase_request_items (purchase_request_id);
grant select, insert, update, delete on public.purchase_request_items to authenticated;
grant all on public.purchase_request_items to service_role;
alter table public.purchase_request_items enable row level security;
create policy "purchase_request_items_read" on public.purchase_request_items for select to authenticated
  using (exists (select 1 from public.purchase_requests pr where pr.id = purchase_request_id and (private.has_permission(pr.company_id, 'procurement.view') or private.is_company_member(pr.company_id))));
create policy "purchase_request_items_write" on public.purchase_request_items for all to authenticated
  using (exists (select 1 from public.purchase_requests pr where pr.id = purchase_request_id and private.has_permission(pr.company_id, 'procurement.manage')))
  with check (exists (select 1 from public.purchase_requests pr where pr.id = purchase_request_id and private.has_permission(pr.company_id, 'procurement.manage')));

-- -------------------- PURCHASE ORDERS -----------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  purchase_request_id uuid references public.purchase_requests(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  po_number text not null,
  status public.purchase_order_status not null default 'draft',
  currency_code text not null default 'NGN',
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  expected_delivery_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, po_number)
);
create index purchase_orders_company_idx on public.purchase_orders (company_id, status, created_at desc);
grant select, insert, update, delete on public.purchase_orders to authenticated;
grant all on public.purchase_orders to service_role;
alter table public.purchase_orders enable row level security;
create policy "purchase_orders_read" on public.purchase_orders for select to authenticated
  using (private.has_permission(company_id, 'procurement.view') or private.is_company_member(company_id));
create policy "purchase_orders_write" on public.purchase_orders for all to authenticated
  using (private.has_permission(company_id, 'procurement.manage'))
  with check (private.has_permission(company_id, 'procurement.manage'));

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null default 0,
  received_quantity numeric(14,3) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index purchase_order_items_po_idx on public.purchase_order_items (purchase_order_id);
grant select, insert, update, delete on public.purchase_order_items to authenticated;
grant all on public.purchase_order_items to service_role;
alter table public.purchase_order_items enable row level security;
create policy "purchase_order_items_read" on public.purchase_order_items for select to authenticated
  using (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and (private.has_permission(po.company_id, 'procurement.view') or private.is_company_member(po.company_id))));
create policy "purchase_order_items_write" on public.purchase_order_items for all to authenticated
  using (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and private.has_permission(po.company_id, 'procurement.manage')))
  with check (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and private.has_permission(po.company_id, 'procurement.manage')));

-- -------------------------- VENDORS --------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  vendor_type text not null default 'supplier',
  status public.vendor_status not null default 'active',
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  country_code text,
  tax_id text,
  payment_terms text,
  currency_code text not null default 'NGN',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code)
);
create index vendors_company_idx on public.vendors (company_id, status);
grant select, insert, update, delete on public.vendors to authenticated;
grant all on public.vendors to service_role;
alter table public.vendors enable row level security;
create policy "vendors_read" on public.vendors for select to authenticated
  using (private.has_permission(company_id, 'vendor.view') or private.is_company_member(company_id));
create policy "vendors_write" on public.vendors for all to authenticated
  using (private.has_permission(company_id, 'vendor.manage'))
  with check (private.has_permission(company_id, 'vendor.manage'));

create table public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  full_name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vendor_contacts_vendor_idx on public.vendor_contacts (vendor_id);
grant select, insert, update, delete on public.vendor_contacts to authenticated;
grant all on public.vendor_contacts to service_role;
alter table public.vendor_contacts enable row level security;
create policy "vendor_contacts_read" on public.vendor_contacts for select to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and (private.has_permission(v.company_id, 'vendor.view') or private.is_company_member(v.company_id))));
create policy "vendor_contacts_write" on public.vendor_contacts for all to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and private.has_permission(v.company_id, 'vendor.manage')))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and private.has_permission(v.company_id, 'vendor.manage')));

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index vendor_documents_vendor_idx on public.vendor_documents (vendor_id);
grant select, insert, update, delete on public.vendor_documents to authenticated;
grant all on public.vendor_documents to service_role;
alter table public.vendor_documents enable row level security;
create policy "vendor_documents_read" on public.vendor_documents for select to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and (private.has_permission(v.company_id, 'vendor.view') or private.is_company_member(v.company_id))));
create policy "vendor_documents_write" on public.vendor_documents for all to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and private.has_permission(v.company_id, 'vendor.manage')))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and private.has_permission(v.company_id, 'vendor.manage')));

-- ----------------------- ASSET CATEGORIES --------------------
create table public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  category_type public.asset_category_type not null default 'other',
  depreciation_rate numeric(5,2),
  useful_life_years integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);
create index asset_categories_company_idx on public.asset_categories (company_id);
grant select, insert, update, delete on public.asset_categories to authenticated;
grant all on public.asset_categories to service_role;
alter table public.asset_categories enable row level security;
create policy "asset_categories_read" on public.asset_categories for select to authenticated
  using (private.has_permission(company_id, 'asset.view') or private.is_company_member(company_id));
create policy "asset_categories_write" on public.asset_categories for all to authenticated
  using (private.has_permission(company_id, 'asset.manage'))
  with check (private.has_permission(company_id, 'asset.manage'));

-- -------------------------- ASSETS ---------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category_id uuid references public.asset_categories(id) on delete set null,
  name text not null,
  description text,
  asset_tag text,
  serial_number text,
  model text,
  manufacturer text,
  purchase_date date,
  purchase_cost numeric(14,2),
  current_value numeric(14,2),
  currency_code text not null default 'NGN',
  status public.asset_status not null default 'active',
  location text,
  assigned_to uuid references public.employees(id) on delete set null,
  warranty_expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_company_idx on public.assets (company_id, status, branch_id);
grant select, insert, update, delete on public.assets to authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;
create policy "assets_read" on public.assets for select to authenticated
  using (private.has_permission(company_id, 'asset.view') or private.is_company_member(company_id));
create policy "assets_write" on public.assets for all to authenticated
  using (private.has_permission(company_id, 'asset.manage'))
  with check (private.has_permission(company_id, 'asset.manage'));

create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index asset_assignments_asset_idx on public.asset_assignments (asset_id);
create index asset_assignments_employee_idx on public.asset_assignments (employee_id);
grant select, insert, update, delete on public.asset_assignments to authenticated;
grant all on public.asset_assignments to service_role;
alter table public.asset_assignments enable row level security;
create policy "asset_assignments_read" on public.asset_assignments for select to authenticated
  using (exists (select 1 from public.assets a where a.id = asset_id and (private.has_permission(a.company_id, 'asset.view') or private.is_company_member(a.company_id))));
create policy "asset_assignments_write" on public.asset_assignments for all to authenticated
  using (exists (select 1 from public.assets a where a.id = asset_id and private.has_permission(a.company_id, 'asset.manage')))
  with check (exists (select 1 from public.assets a where a.id = asset_id and private.has_permission(a.company_id, 'asset.manage')));

-- --------------------- MAINTENANCE REQUESTS ----------------
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  request_number text not null,
  title text not null,
  description text,
  maintenance_type public.maintenance_type not null default 'corrective',
  status public.maintenance_status not null default 'open',
  priority text not null default 'normal',
  scheduled_for timestamptz,
  completed_at timestamptz,
  cost_estimate numeric(14,2),
  actual_cost numeric(14,2),
  assigned_to uuid references public.employees(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, request_number)
);
create index maintenance_requests_company_idx on public.maintenance_requests (company_id, status, created_at desc);
grant select, insert, update, delete on public.maintenance_requests to authenticated;
grant all on public.maintenance_requests to service_role;
alter table public.maintenance_requests enable row level security;
create policy "maintenance_requests_read" on public.maintenance_requests for select to authenticated
  using (private.has_permission(company_id, 'maintenance.view') or private.is_company_member(company_id));
create policy "maintenance_requests_write" on public.maintenance_requests for all to authenticated
  using (private.has_permission(company_id, 'maintenance.manage'))
  with check (private.has_permission(company_id, 'maintenance.manage'));

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  performed_by uuid references public.employees(id) on delete set null,
  notes text,
  cost numeric(14,2) not null default 0,
  currency_code text not null default 'NGN',
  downtime_hours numeric(6,2),
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);
create index maintenance_records_company_idx on public.maintenance_records (company_id, created_at desc);
grant select, insert, update, delete on public.maintenance_records to authenticated;
grant all on public.maintenance_records to service_role;
alter table public.maintenance_records enable row level security;
create policy "maintenance_records_read" on public.maintenance_records for select to authenticated
  using (private.has_permission(company_id, 'maintenance.view') or private.is_company_member(company_id));
create policy "maintenance_records_write" on public.maintenance_records for all to authenticated
  using (private.has_permission(company_id, 'maintenance.manage'))
  with check (private.has_permission(company_id, 'maintenance.manage'));

-- -------------------------- VEHICLES -------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  registration_number text not null,
  vehicle_type text not null default 'car',
  manufacturer text,
  model text,
  year integer,
  color text,
  status public.vehicle_status not null default 'active',
  assigned_to uuid references public.employees(id) on delete set null,
  insurance_expires_at date,
  registration_expires_at date,
  last_service_at date,
  next_service_at date,
  mileage_km numeric(12,1) not null default 0,
  fuel_type text not null default 'petrol',
  tank_capacity_l numeric(8,1),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, registration_number)
);
create index vehicles_company_idx on public.vehicles (company_id, status, branch_id);
grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
alter table public.vehicles enable row level security;
create policy "vehicles_read" on public.vehicles for select to authenticated
  using (private.has_permission(company_id, 'fleet.view') or private.is_company_member(company_id));
create policy "vehicles_write" on public.vehicles for all to authenticated
  using (private.has_permission(company_id, 'fleet.manage'))
  with check (private.has_permission(company_id, 'fleet.manage'));

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  purpose text,
  notes text,
  created_at timestamptz not null default now()
);
create index vehicle_assignments_vehicle_idx on public.vehicle_assignments (vehicle_id);
create index vehicle_assignments_employee_idx on public.vehicle_assignments (employee_id);
grant select, insert, update, delete on public.vehicle_assignments to authenticated;
grant all on public.vehicle_assignments to service_role;
alter table public.vehicle_assignments enable row level security;
create policy "vehicle_assignments_read" on public.vehicle_assignments for select to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and (private.has_permission(v.company_id, 'fleet.view') or private.is_company_member(v.company_id))));
create policy "vehicle_assignments_write" on public.vehicle_assignments for all to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and private.has_permission(v.company_id, 'fleet.manage')))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and private.has_permission(v.company_id, 'fleet.manage')));

create table public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  recorded_at timestamptz not null default now(),
  liters numeric(10,2) not null check (liters > 0),
  unit_cost numeric(10,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  currency_code text not null default 'NGN',
  odometer_km numeric(12,1),
  fuel_type text not null default 'petrol',
  station_name text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index fuel_records_vehicle_idx on public.fuel_records (vehicle_id, recorded_at desc);
grant select, insert, update, delete on public.fuel_records to authenticated;
grant all on public.fuel_records to service_role;
alter table public.fuel_records enable row level security;
create policy "fuel_records_read" on public.fuel_records for select to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and (private.has_permission(v.company_id, 'fleet.view') or private.is_company_member(v.company_id))));
create policy "fuel_records_write" on public.fuel_records for all to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and private.has_permission(v.company_id, 'fleet.manage')))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and private.has_permission(v.company_id, 'fleet.manage')));

create table public.fleet_trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.employees(id) on delete set null,
  start_location text,
  end_location text,
  start_odometer_km numeric(12,1),
  end_odometer_km numeric(12,1),
  distance_km numeric(12,2),
  started_at timestamptz,
  ended_at timestamptz,
  purpose text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index fleet_trips_vehicle_idx on public.fleet_trips (vehicle_id, created_at desc);
grant select, insert, update, delete on public.fleet_trips to authenticated;
grant all on public.fleet_trips to service_role;
alter table public.fleet_trips enable row level security;
create policy "fleet_trips_read" on public.fleet_trips for select to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and (private.has_permission(v.company_id, 'fleet.view') or private.is_company_member(v.company_id))));
create policy "fleet_trips_write" on public.fleet_trips for all to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and private.has_permission(v.company_id, 'fleet.manage')))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and private.has_permission(v.company_id, 'fleet.manage')));

-- ------------------ ENTERPRISE DOCUMENTS ---------------------
create table public.enterprise_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type public.enterprise_document_type not null default 'other',
  related_id uuid,
  related_module text,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  description text,
  is_public boolean not null default false,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enterprise_documents_company_idx on public.enterprise_documents (company_id, document_type, related_id);
grant select, insert, update, delete on public.enterprise_documents to authenticated;
grant all on public.enterprise_documents to service_role;
alter table public.enterprise_documents enable row level security;
create policy "enterprise_documents_read" on public.enterprise_documents for select to authenticated
  using (is_public = true or private.has_permission(company_id, 'document.view') or private.is_company_member(company_id));
create policy "enterprise_documents_write" on public.enterprise_documents for all to authenticated
  using (private.has_permission(company_id, 'document.manage'))
  with check (private.has_permission(company_id, 'document.manage'));

-- --------------------- TIMESTAMP + AUDIT TRIGGERS -------------
create trigger tr_warehouses_updated before update on public.warehouses for each row execute function public.set_updated_at();
create trigger tr_warehouse_locations_updated before update on public.warehouse_locations for each row execute function public.set_updated_at();
create trigger tr_warehouse_transfers_updated before update on public.warehouse_transfers for each row execute function public.set_updated_at();
create trigger tr_purchase_requests_updated before update on public.purchase_requests for each row execute function public.set_updated_at();
create trigger tr_purchase_orders_updated before update on public.purchase_orders for each row execute function public.set_updated_at();
create trigger tr_vendors_updated before update on public.vendors for each row execute function public.set_updated_at();
create trigger tr_asset_categories_updated before update on public.asset_categories for each row execute function public.set_updated_at();
create trigger tr_assets_updated before update on public.assets for each row execute function public.set_updated_at();
create trigger tr_maintenance_requests_updated before update on public.maintenance_requests for each row execute function public.set_updated_at();
create trigger tr_vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger tr_enterprise_documents_updated before update on public.enterprise_documents for each row execute function public.set_updated_at();

create trigger tr_audit_warehouses after insert or update or delete on public.warehouses for each row execute function public.audit_m2_change();
create trigger tr_audit_warehouse_locations after insert or update or delete on public.warehouse_locations for each row execute function public.audit_m2_change();
create trigger tr_audit_warehouse_transfers after insert or update or delete on public.warehouse_transfers for each row execute function public.audit_m2_change();
create trigger tr_audit_purchase_requests after insert or update or delete on public.purchase_requests for each row execute function public.audit_m2_change();
create trigger tr_audit_purchase_orders after insert or update or delete on public.purchase_orders for each row execute function public.audit_m2_change();
create trigger tr_audit_vendors after insert or update or delete on public.vendors for each row execute function public.audit_m2_change();
create trigger tr_audit_asset_categories after insert or update or delete on public.asset_categories for each row execute function public.audit_m2_change();
create trigger tr_audit_assets after insert or update or delete on public.assets for each row execute function public.audit_m2_change();
create trigger tr_audit_maintenance_requests after insert or update or delete on public.maintenance_requests for each row execute function public.audit_m2_change();
create trigger tr_audit_vehicles after insert or update or delete on public.vehicles for each row execute function public.audit_m2_change();
create trigger tr_audit_enterprise_documents after insert or update or delete on public.enterprise_documents for each row execute function public.audit_m2_change();

-- --------------------------- PERMISSIONS ----------------------
insert into public.permissions (key, module, description) values
  ('warehouse.view',       'enterprise', 'View warehouses and stock locations'),
  ('warehouse.manage',     'enterprise', 'Create and manage warehouses and locations'),
  ('procurement.view',     'enterprise', 'View purchase requests and orders'),
  ('procurement.manage',   'enterprise', 'Create and manage purchase requests and orders'),
  ('procurement.approve',  'enterprise', 'Approve purchase requests'),
  ('vendor.view',          'enterprise', 'View vendors and supplier profiles'),
  ('vendor.manage',        'enterprise', 'Create and manage vendors'),
  ('asset.view',           'enterprise', 'View assets and assignments'),
  ('asset.manage',         'enterprise', 'Create and manage assets and categories'),
  ('maintenance.view',     'enterprise', 'View maintenance requests and records'),
  ('maintenance.manage',   'enterprise', 'Create and manage maintenance'),
  ('fleet.view',           'enterprise', 'View vehicles, trips and fuel'),
  ('fleet.manage',         'enterprise', 'Create and manage fleet'),
  ('branch.view',          'enterprise', 'View branches'),
  ('branch.manage',        'enterprise', 'Create, edit and archive branches'),
  ('document.view',        'enterprise', 'View enterprise documents'),
  ('document.manage',      'enterprise', 'Upload and manage enterprise documents')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, v.perm
from public.roles r
join (values
  ('owner','warehouse.view'),('owner','warehouse.manage'),('owner','procurement.view'),('owner','procurement.manage'),('owner','procurement.approve'),
  ('owner','vendor.view'),('owner','vendor.manage'),('owner','asset.view'),('owner','asset.manage'),('owner','maintenance.view'),('owner','maintenance.manage'),
  ('owner','fleet.view'),('owner','fleet.manage'),('owner','branch.view'),('owner','branch.manage'),('owner','document.view'),('owner','document.manage'),
  ('admin','warehouse.view'),('admin','warehouse.manage'),('admin','procurement.view'),('admin','procurement.manage'),('admin','procurement.approve'),
  ('admin','vendor.view'),('admin','vendor.manage'),('admin','asset.view'),('admin','asset.manage'),('admin','maintenance.view'),('admin','maintenance.manage'),
  ('admin','fleet.view'),('admin','fleet.manage'),('admin','branch.view'),('admin','branch.manage'),('admin','document.view'),('admin','document.manage'),
  ('manager','warehouse.view'),('manager','warehouse.manage'),('manager','procurement.view'),('manager','procurement.manage'),('manager','procurement.approve'),
  ('manager','vendor.view'),('manager','vendor.manage'),('manager','asset.view'),('manager','asset.manage'),('manager','maintenance.view'),('manager','maintenance.manage'),
  ('manager','fleet.view'),('manager','fleet.manage'),('manager','branch.view'),('manager','branch.manage'),('manager','document.view'),
  ('staff','warehouse.view'),('staff','vendor.view'),('staff','asset.view'),('staff','maintenance.view'),('staff','fleet.view'),('staff','branch.view'),('staff','document.view'),
  ('viewer','warehouse.view'),('viewer','vendor.view'),('viewer','asset.view'),('viewer','maintenance.view'),('viewer','fleet.view'),('viewer','branch.view'),('viewer','document.view')
) as v(role_key, perm) on v.role_key = r.key
on conflict do nothing;
