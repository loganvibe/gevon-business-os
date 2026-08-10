-- ============================================================
-- MILESTONE 12 — COMMERCE ENGINE
-- ============================================================

-- ---------------------------- ENUMS -------------------------
do $$ begin create type public.commerce_channel_type as enum ('in_store','online','mobile','qr','whatsapp','delivery','external_pos','marketplace'); exception when duplicate_object then null; end $$;
do $$ begin create type public.cart_status as enum ('open','converted','abandoned','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.pos_session_status as enum ('open','closed','reconciled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.delivery_status as enum ('pending','assigned','picked_up','in_transit','delivered','failed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.reservation_status as enum ('requested','confirmed','checked_in','completed','cancelled','no_show'); exception when duplicate_object then null; end $$;
do $$ begin create type public.qr_code_type as enum ('store','table','product','order','payment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.receipt_delivery_status as enum ('not_sent','queued','sent','failed'); exception when duplicate_object then null; end $$;

-- Extend the existing order lifecycle (reuse, do not duplicate sales/orders).
do $$ begin alter type public.order_status add value if not exists 'preparing'; exception when others then null; end $$;
do $$ begin alter type public.order_status add value if not exists 'ready'; exception when others then null; end $$;
do $$ begin alter type public.order_status add value if not exists 'out_for_delivery'; exception when others then null; end $$;
do $$ begin alter type public.order_status add value if not exists 'returned'; exception when others then null; end $$;

-- ------------------------ COMMERCE CHANNELS ------------------
create table public.commerce_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  channel_type public.commerce_channel_type not null,
  name text not null,
  is_enabled boolean not null default true,
  adapter_key text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, channel_type, name)
);
create index commerce_channels_company_idx on public.commerce_channels (company_id, is_enabled);
grant select, insert, update, delete on public.commerce_channels to authenticated;
grant all on public.commerce_channels to service_role;
alter table public.commerce_channels enable row level security;
create policy "commerce_channels_read" on public.commerce_channels for select to authenticated
  using (private.has_permission(company_id, 'commerce.view'));
create policy "commerce_channels_write" on public.commerce_channels for all to authenticated
  using (private.has_permission(company_id, 'commerce.manage'))
  with check (private.has_permission(company_id, 'commerce.manage'));

-- ----------------------------- STORES ------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  slug text not null,
  name text not null,
  tagline text,
  description text,
  logo_url text,
  banner_url text,
  currency_code text not null default 'NGN',
  contact_phone text,
  contact_email text,
  address text,
  is_published boolean not null default false,
  accepts_delivery boolean not null default false,
  accepts_pickup boolean not null default true,
  delivery_fee numeric(14,2) not null default 0,
  min_order_amount numeric(14,2) not null default 0,
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index stores_slug_uniq on public.stores (slug) where deleted_at is null;
create index stores_company_idx on public.stores (company_id, is_published);
grant select, insert, update, delete on public.stores to authenticated;
grant select on public.stores to anon;
grant all on public.stores to service_role;
alter table public.stores enable row level security;
create policy "stores_public_read" on public.stores for select to anon
  using (is_published = true and deleted_at is null);
create policy "stores_read" on public.stores for select to authenticated
  using (private.has_permission(company_id, 'commerce.view') or (is_published = true and deleted_at is null));
create policy "stores_write" on public.stores for all to authenticated
  using (private.has_permission(company_id, 'store.manage'))
  with check (private.has_permission(company_id, 'store.manage'));

-- -------------------------- STORE PRODUCTS -------------------
create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  is_published boolean not null default false,
  price_override numeric(14,2),
  availability text not null default 'in_stock',
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  public_description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, product_id)
);
create index store_products_store_idx on public.store_products (store_id, is_published, sort_order);
grant select, insert, update, delete on public.store_products to authenticated;
grant select on public.store_products to anon;
grant all on public.store_products to service_role;
alter table public.store_products enable row level security;
create policy "store_products_public_read" on public.store_products for select to anon
  using (is_published = true and exists (select 1 from public.stores s where s.id = store_id and s.is_published = true and s.deleted_at is null));
create policy "store_products_read" on public.store_products for select to authenticated
  using (private.has_permission(company_id, 'commerce.view') or is_published = true);
create policy "store_products_write" on public.store_products for all to authenticated
  using (private.has_permission(company_id, 'store.manage'))
  with check (private.has_permission(company_id, 'store.manage'));

-- ------------------------------ CARTS ------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  session_token text not null default encode(gen_random_bytes(24), 'hex'),
  channel public.sale_channel not null default 'walk_in',
  status public.cart_status not null default 'open',
  customer_id uuid references public.customers(id) on delete set null,
  coupon_code text,
  promotion_id uuid references public.promotions(id) on delete set null,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency_code text not null default 'NGN',
  notes text,
  sale_id uuid references public.sales(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_session_token_uniq on public.carts (session_token);
create index carts_company_idx on public.carts (company_id, status, created_at desc);
grant select, insert, update, delete on public.carts to authenticated;
grant all on public.carts to service_role;
alter table public.carts enable row level security;
create policy "carts_read" on public.carts for select to authenticated
  using (private.has_permission(company_id, 'commerce.view'));
create policy "carts_write" on public.carts for all to authenticated
  using (private.has_permission(company_id, 'checkout.create'))
  with check (private.has_permission(company_id, 'checkout.create'));

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  name_snapshot text,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  discount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cart_items_cart_idx on public.cart_items (cart_id);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "cart_items_read" on public.cart_items for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and private.has_permission(c.company_id, 'commerce.view')));
create policy "cart_items_write" on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and private.has_permission(c.company_id, 'checkout.create')))
  with check (exists (select 1 from public.carts c where c.id = cart_id and private.has_permission(c.company_id, 'checkout.create')));

-- ----------------------- POS REGISTERS / SESSIONS ------------
create table public.pos_registers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  device_identifier text,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);
grant select, insert, update, delete on public.pos_registers to authenticated;
grant all on public.pos_registers to service_role;
alter table public.pos_registers enable row level security;
create policy "pos_registers_read" on public.pos_registers for select to authenticated
  using (private.has_permission(company_id, 'pos.access'));
create policy "pos_registers_write" on public.pos_registers for all to authenticated
  using (private.has_permission(company_id, 'pos.manage'))
  with check (private.has_permission(company_id, 'pos.manage'));

create table public.pos_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  register_id uuid references public.pos_registers(id) on delete set null,
  cashier_user_id uuid not null,
  status public.pos_session_status not null default 'open',
  opening_balance numeric(14,2) not null default 0,
  closing_balance numeric(14,2),
  counted_cash numeric(14,2),
  expected_cash numeric(14,2),
  difference numeric(14,2),
  sales_count integer not null default 0,
  sales_total numeric(14,2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pos_sessions_company_idx on public.pos_sessions (company_id, status, opened_at desc);
grant select, insert, update, delete on public.pos_sessions to authenticated;
grant all on public.pos_sessions to service_role;
alter table public.pos_sessions enable row level security;
create policy "pos_sessions_read" on public.pos_sessions for select to authenticated
  using (private.has_permission(company_id, 'pos.access'));
create policy "pos_sessions_write" on public.pos_sessions for all to authenticated
  using (private.has_permission(company_id, 'pos.access') and (cashier_user_id = auth.uid() or private.has_permission(company_id, 'pos.manage')))
  with check (private.has_permission(company_id, 'pos.access') and (cashier_user_id = auth.uid() or private.has_permission(company_id, 'pos.manage')));

-- ---------------------------- RECEIPTS -----------------------
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  receipt_number text not null,
  issued_at timestamptz not null default now(),
  business_snapshot jsonb not null default '{}'::jsonb,
  customer_name text,
  customer_contact text,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency_code text not null default 'NGN',
  payment_method public.payment_method,
  delivery_status public.receipt_delivery_status not null default 'not_sent',
  delivery_channel public.communication_channel,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, receipt_number)
);
create index receipts_company_idx on public.receipts (company_id, issued_at desc);
grant select, insert, update, delete on public.receipts to authenticated;
grant all on public.receipts to service_role;
alter table public.receipts enable row level security;
create policy "receipts_read" on public.receipts for select to authenticated
  using (private.has_permission(company_id, 'receipt.view'));
create policy "receipts_write" on public.receipts for all to authenticated
  using (private.has_permission(company_id, 'receipt.manage'))
  with check (private.has_permission(company_id, 'receipt.manage'));

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index receipt_items_receipt_idx on public.receipt_items (receipt_id);
grant select, insert, update, delete on public.receipt_items to authenticated;
grant all on public.receipt_items to service_role;
alter table public.receipt_items enable row level security;
create policy "receipt_items_read" on public.receipt_items for select to authenticated
  using (exists (select 1 from public.receipts r where r.id = receipt_id and private.has_permission(r.company_id, 'receipt.view')));
create policy "receipt_items_write" on public.receipt_items for all to authenticated
  using (exists (select 1 from public.receipts r where r.id = receipt_id and private.has_permission(r.company_id, 'receipt.manage')))
  with check (exists (select 1 from public.receipts r where r.id = receipt_id and private.has_permission(r.company_id, 'receipt.manage')));

-- ------------------------- DELIVERY ORDERS -------------------
create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status public.delivery_status not null default 'pending',
  recipient_name text,
  recipient_phone text,
  address_line text not null,
  city text,
  state text,
  landmark text,
  delivery_fee numeric(14,2) not null default 0,
  assigned_to uuid,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  estimated_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index delivery_orders_company_idx on public.delivery_orders (company_id, status, created_at desc);
grant select, insert, update, delete on public.delivery_orders to authenticated;
grant all on public.delivery_orders to service_role;
alter table public.delivery_orders enable row level security;
create policy "delivery_orders_read" on public.delivery_orders for select to authenticated
  using (private.has_permission(company_id, 'commerce.view'));
create policy "delivery_orders_write" on public.delivery_orders for all to authenticated
  using (private.has_permission(company_id, 'delivery.manage'))
  with check (private.has_permission(company_id, 'delivery.manage'));

-- --------------------------- RESERVATIONS --------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  reservation_number text,
  contact_name text,
  contact_phone text,
  reserved_for timestamptz not null,
  duration_minutes integer not null default 60,
  party_size integer not null default 1 check (party_size > 0),
  resource_label text,
  status public.reservation_status not null default 'requested',
  notes text,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reservations_company_idx on public.reservations (company_id, reserved_for desc, status);
grant select, insert, update, delete on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "reservations_read" on public.reservations for select to authenticated
  using (private.has_permission(company_id, 'commerce.view'));
create policy "reservations_write" on public.reservations for all to authenticated
  using (private.has_permission(company_id, 'reservation.manage'))
  with check (private.has_permission(company_id, 'reservation.manage'));

-- ----------------------------- QR CODES ----------------------
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  store_id uuid references public.stores(id) on delete cascade,
  code text not null,
  qr_type public.qr_code_type not null default 'store',
  label text,
  target_path text,
  is_active boolean not null default true,
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
grant select, insert, update, delete on public.qr_codes to authenticated;
grant all on public.qr_codes to service_role;
alter table public.qr_codes enable row level security;
create policy "qr_codes_read" on public.qr_codes for select to authenticated
  using (private.has_permission(company_id, 'commerce.view'));
create policy "qr_codes_write" on public.qr_codes for all to authenticated
  using (private.has_permission(company_id, 'commerce.manage'))
  with check (private.has_permission(company_id, 'commerce.manage'));

-- --------------------- TIMESTAMP + AUDIT TRIGGERS -------------
create trigger set_updated_at_commerce_channels before update on public.commerce_channels for each row execute function public.set_updated_at();
create trigger set_updated_at_stores before update on public.stores for each row execute function public.set_updated_at();
create trigger set_updated_at_store_products before update on public.store_products for each row execute function public.set_updated_at();
create trigger set_updated_at_carts before update on public.carts for each row execute function public.set_updated_at();
create trigger set_updated_at_cart_items before update on public.cart_items for each row execute function public.set_updated_at();
create trigger set_updated_at_pos_registers before update on public.pos_registers for each row execute function public.set_updated_at();
create trigger set_updated_at_pos_sessions before update on public.pos_sessions for each row execute function public.set_updated_at();
create trigger set_updated_at_receipts before update on public.receipts for each row execute function public.set_updated_at();
create trigger set_updated_at_delivery_orders before update on public.delivery_orders for each row execute function public.set_updated_at();
create trigger set_updated_at_reservations before update on public.reservations for each row execute function public.set_updated_at();
create trigger set_updated_at_qr_codes before update on public.qr_codes for each row execute function public.set_updated_at();

create trigger audit_stores after insert or update or delete on public.stores for each row execute function public.audit_m2_change();
create trigger audit_store_products after insert or update or delete on public.store_products for each row execute function public.audit_m2_change();
create trigger audit_pos_sessions after insert or update or delete on public.pos_sessions for each row execute function public.audit_m2_change();
create trigger audit_receipts after insert or update or delete on public.receipts for each row execute function public.audit_m2_change();
create trigger audit_delivery_orders after insert or update or delete on public.delivery_orders for each row execute function public.audit_m2_change();
create trigger audit_reservations after insert or update or delete on public.reservations for each row execute function public.audit_m2_change();
create trigger audit_commerce_channels after insert or update or delete on public.commerce_channels for each row execute function public.audit_m2_change();
create trigger audit_qr_codes after insert or update or delete on public.qr_codes for each row execute function public.audit_m2_change();

-- --------------------------- PERMISSIONS ----------------------
insert into public.permissions (key, module, description) values
  ('commerce.view',       'commerce', 'View the commerce workspace'),
  ('commerce.manage',     'commerce', 'Manage commerce channels and configuration'),
  ('pos.access',          'commerce', 'Use the point of sale and open cashier sessions'),
  ('pos.manage',          'commerce', 'Manage registers and reconcile cashier sessions'),
  ('checkout.create',     'commerce', 'Create carts and complete checkouts'),
  ('receipt.view',        'commerce', 'View receipts'),
  ('receipt.manage',      'commerce', 'Issue and send receipts'),
  ('store.manage',        'commerce', 'Manage the online store and published catalogue'),
  ('delivery.manage',     'commerce', 'Manage deliveries and delivery status'),
  ('reservation.manage',  'commerce', 'Manage reservations')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, v.perm
from public.roles r
join (values
  ('owner','commerce.view'),('owner','commerce.manage'),('owner','pos.access'),('owner','pos.manage'),
  ('owner','checkout.create'),('owner','receipt.view'),('owner','receipt.manage'),('owner','store.manage'),
  ('owner','delivery.manage'),('owner','reservation.manage'),
  ('admin','commerce.view'),('admin','commerce.manage'),('admin','pos.access'),('admin','pos.manage'),
  ('admin','checkout.create'),('admin','receipt.view'),('admin','receipt.manage'),('admin','store.manage'),
  ('admin','delivery.manage'),('admin','reservation.manage'),
  ('manager','commerce.view'),('manager','pos.access'),('manager','pos.manage'),('manager','checkout.create'),
  ('manager','receipt.view'),('manager','receipt.manage'),('manager','delivery.manage'),('manager','reservation.manage'),
  ('staff','commerce.view'),('staff','pos.access'),('staff','checkout.create'),('staff','receipt.view')
) as v(role_key, perm) on v.role_key = r.key
on conflict do nothing;