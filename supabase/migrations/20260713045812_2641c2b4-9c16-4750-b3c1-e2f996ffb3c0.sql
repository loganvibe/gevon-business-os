
create type public.stock_movement_type as enum (
  'purchase','sale','adjustment','damaged','expired',
  'transfer_in','transfer_out','opening_balance','return'
);
create type public.product_status as enum ('active','archived','draft');
create type public.product_unit as enum (
  'piece','kg','g','l','ml','box','pack','carton','dozen','other'
);
create type public.supplier_status as enum ('active','archived');
create type public.purchase_status as enum ('draft','recorded','cancelled');

-- ---------- product_categories ----------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index product_categories_unique_name
  on public.product_categories(company_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  where deleted_at is null;
grant select, insert, update, delete on public.product_categories to authenticated;
grant all on public.product_categories to service_role;
alter table public.product_categories enable row level security;
create policy pc_select on public.product_categories for select to authenticated
  using (private.is_company_member(company_id));
create policy pc_write on public.product_categories for all to authenticated
  using (private.has_permission(company_id, 'inventory.update'))
  with check (private.has_permission(company_id, 'inventory.update'));
create trigger tr_product_categories_updated before update on public.product_categories
  for each row execute function public.set_updated_at();
create trigger tr_audit_product_categories
  after insert or update or delete on public.product_categories
  for each row execute function public.audit_m2_change();

-- ---------- products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  sku text,
  barcode text,
  category_id uuid references public.product_categories(id) on delete set null,
  unit public.product_unit not null default 'piece',
  cost_price numeric(18,4) not null default 0,
  selling_price numeric(18,4) not null default 0,
  currency_code text not null default 'NGN',
  image_url text,
  status public.product_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index products_sku_unique on public.products(company_id, sku)
  where sku is not null and deleted_at is null;
create unique index products_barcode_unique on public.products(company_id, barcode)
  where barcode is not null and deleted_at is null;
create index products_company_status_idx on public.products(company_id, status);
create index products_category_idx on public.products(category_id);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy products_select on public.products for select to authenticated
  using (private.is_company_member(company_id));
create policy products_insert on public.products for insert to authenticated
  with check (private.has_permission(company_id, 'inventory.create'));
create policy products_update on public.products for update to authenticated
  using (private.has_permission(company_id, 'inventory.update'))
  with check (private.has_permission(company_id, 'inventory.update'));
create policy products_delete on public.products for delete to authenticated
  using (private.has_permission(company_id, 'inventory.delete'));
create trigger tr_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger tr_audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_m2_change();

-- ---------- inventory_items ----------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  quantity numeric(18,4) not null default 0,
  reserved_quantity numeric(18,4) not null default 0,
  minimum_stock_level numeric(18,4) not null default 0,
  maximum_stock_level numeric(18,4),
  reorder_point numeric(18,4),
  last_movement_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, branch_id)
);
create index inventory_items_company_idx on public.inventory_items(company_id);
create index inventory_items_low_stock_idx on public.inventory_items(company_id)
  where quantity <= minimum_stock_level;
grant select, insert, update, delete on public.inventory_items to authenticated;
grant all on public.inventory_items to service_role;
alter table public.inventory_items enable row level security;
create policy inv_select on public.inventory_items for select to authenticated
  using (private.is_company_member(company_id));
create policy inv_write on public.inventory_items for all to authenticated
  using (private.has_permission(company_id, 'inventory.update'))
  with check (private.has_permission(company_id, 'inventory.update'));
create trigger tr_inventory_items_updated before update on public.inventory_items
  for each row execute function public.set_updated_at();
create trigger tr_audit_inventory_items
  after insert or update or delete on public.inventory_items
  for each row execute function public.audit_m2_change();

-- ---------- stock_movements (append-only) ----------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  movement_type public.stock_movement_type not null,
  quantity numeric(18,4) not null,
  previous_quantity numeric(18,4) not null default 0,
  new_quantity numeric(18,4) not null default 0,
  unit_cost numeric(18,4),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index sm_company_created_idx on public.stock_movements(company_id, created_at desc);
create index sm_product_idx on public.stock_movements(product_id, created_at desc);
create index sm_branch_idx on public.stock_movements(branch_id, created_at desc);
grant select, insert on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy sm_select on public.stock_movements for select to authenticated
  using (private.is_company_member(company_id));
create policy sm_insert on public.stock_movements for insert to authenticated
  with check (
    private.has_permission(company_id, 'inventory.adjust')
    or private.has_permission(company_id, 'purchase.manage')
  );
create trigger tr_audit_stock_movements
  after insert on public.stock_movements
  for each row execute function public.audit_m2_change();

-- ---------- suppliers ----------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address jsonb,
  tax_id text,
  notes text,
  status public.supplier_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index suppliers_company_idx on public.suppliers(company_id, status);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy suppliers_select on public.suppliers for select to authenticated
  using (private.has_permission(company_id, 'supplier.view'));
create policy suppliers_write on public.suppliers for all to authenticated
  using (private.has_permission(company_id, 'supplier.manage'))
  with check (private.has_permission(company_id, 'supplier.manage'));
create trigger tr_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();
create trigger tr_audit_suppliers
  after insert or update or delete on public.suppliers
  for each row execute function public.audit_m2_change();

-- ---------- supplier_products ----------
create table public.supplier_products (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_sku text,
  cost_price numeric(18,4),
  lead_time_days int,
  created_at timestamptz not null default now(),
  primary key (supplier_id, product_id)
);
grant select, insert, update, delete on public.supplier_products to authenticated;
grant all on public.supplier_products to service_role;
alter table public.supplier_products enable row level security;
create policy sp_select on public.supplier_products for select to authenticated
  using (exists (select 1 from public.suppliers s
    where s.id = supplier_id and private.has_permission(s.company_id, 'supplier.view')));
create policy sp_write on public.supplier_products for all to authenticated
  using (exists (select 1 from public.suppliers s
    where s.id = supplier_id and private.has_permission(s.company_id, 'supplier.manage')))
  with check (exists (select 1 from public.suppliers s
    where s.id = supplier_id and private.has_permission(s.company_id, 'supplier.manage')));

-- ---------- purchase_records ----------
create table public.purchase_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete cascade,
  reference text,
  purchase_date date not null default current_date,
  total_amount numeric(18,4) not null default 0,
  currency_code text not null default 'NGN',
  status public.purchase_status not null default 'recorded',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index purchases_company_date_idx on public.purchase_records(company_id, purchase_date desc);
grant select, insert, update, delete on public.purchase_records to authenticated;
grant all on public.purchase_records to service_role;
alter table public.purchase_records enable row level security;
create policy pr_select on public.purchase_records for select to authenticated
  using (private.has_permission(company_id, 'purchase.manage'));
create policy pr_write on public.purchase_records for all to authenticated
  using (private.has_permission(company_id, 'purchase.manage'))
  with check (private.has_permission(company_id, 'purchase.manage'));
create trigger tr_purchase_records_updated before update on public.purchase_records
  for each row execute function public.set_updated_at();
create trigger tr_audit_purchase_records
  after insert or update or delete on public.purchase_records
  for each row execute function public.audit_m2_change();

-- ---------- purchase_record_items ----------
create table public.purchase_record_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchase_records(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(18,4) not null,
  unit_cost numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0
);
create index pri_purchase_idx on public.purchase_record_items(purchase_id);
grant select, insert, update, delete on public.purchase_record_items to authenticated;
grant all on public.purchase_record_items to service_role;
alter table public.purchase_record_items enable row level security;
create policy pri_select on public.purchase_record_items for select to authenticated
  using (exists (select 1 from public.purchase_records p
    where p.id = purchase_id and private.has_permission(p.company_id, 'purchase.manage')));
create policy pri_write on public.purchase_record_items for all to authenticated
  using (exists (select 1 from public.purchase_records p
    where p.id = purchase_id and private.has_permission(p.company_id, 'purchase.manage')))
  with check (exists (select 1 from public.purchase_records p
    where p.id = purchase_id and private.has_permission(p.company_id, 'purchase.manage')));

-- Permissions seed (with required module column)
insert into public.permissions(key, module, description) values
  ('inventory.view',   'inventory', 'View products and stock levels'),
  ('inventory.create', 'inventory', 'Create new products'),
  ('inventory.update', 'inventory', 'Edit products, categories, and stock settings'),
  ('inventory.delete', 'inventory', 'Delete or archive products'),
  ('inventory.adjust', 'inventory', 'Record stock adjustments and transfers'),
  ('supplier.view',    'inventory', 'View suppliers'),
  ('supplier.manage',  'inventory', 'Create and edit suppliers'),
  ('purchase.manage',  'inventory', 'Record and manage supplier purchases')
on conflict (key) do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('inventory.view'),('inventory.create'),('inventory.update'),
  ('inventory.delete'),('inventory.adjust'),
  ('supplier.view'),('supplier.manage'),('purchase.manage')
) as p(key)
where r.key in ('owner','admin')
on conflict do nothing;

-- Stock movement engine
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev numeric(18,4);
  v_delta numeric(18,4);
  v_new numeric(18,4);
  v_min numeric(18,4);
  v_item_id uuid;
begin
  v_delta := case new.movement_type
    when 'purchase' then new.quantity
    when 'return' then new.quantity
    when 'transfer_in' then new.quantity
    when 'opening_balance' then new.quantity
    when 'sale' then -new.quantity
    when 'transfer_out' then -new.quantity
    when 'damaged' then -new.quantity
    when 'expired' then -new.quantity
    when 'adjustment' then new.quantity
    else new.quantity
  end;

  select id, quantity, minimum_stock_level
    into v_item_id, v_prev, v_min
  from public.inventory_items
  where product_id = new.product_id and branch_id = new.branch_id
  for update;

  if v_item_id is null then
    insert into public.inventory_items(company_id, product_id, branch_id, quantity)
    values (new.company_id, new.product_id, new.branch_id, 0)
    returning id, quantity, minimum_stock_level into v_item_id, v_prev, v_min;
  end if;

  v_new := v_prev + v_delta;

  if v_new < 0 and new.movement_type not in ('adjustment','damaged','expired') then
    raise exception 'Stock cannot go negative for product % at branch %', new.product_id, new.branch_id;
  end if;

  new.previous_quantity := v_prev;
  new.new_quantity := v_new;

  update public.inventory_items
    set quantity = v_new, last_movement_at = now(), updated_at = now()
    where id = v_item_id;

  return new;
end;
$$;

create trigger tr_apply_stock_movement
  before insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

create or replace function public.detect_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min numeric(18,4);
begin
  select minimum_stock_level into v_min
    from public.inventory_items
    where product_id = new.product_id and branch_id = new.branch_id;

  if v_min is not null and v_min > 0
     and new.new_quantity <= v_min
     and new.previous_quantity > v_min then
    insert into public.event_queue(company_id, event_key, version, payload, status, next_run_at)
    values (
      new.company_id,
      'inventory.stock.low_detected',
      1,
      jsonb_build_object(
        'companyId', new.company_id,
        'productId', new.product_id,
        'branchId', new.branch_id,
        'quantity', new.new_quantity,
        'minimum', v_min
      ),
      'queued',
      now()
    );
  end if;
  return new;
end;
$$;

create trigger tr_detect_low_stock
  after insert on public.stock_movements
  for each row execute function public.detect_low_stock();

-- Atomic purchase recording
create or replace function public.record_purchase_atomic(
  _company_id uuid,
  _supplier_id uuid,
  _branch_id uuid,
  _purchase_date date,
  _currency text,
  _reference text,
  _notes text,
  _items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_item jsonb;
  v_total numeric(18,4) := 0;
  v_line_total numeric(18,4);
  v_pid uuid;
  v_qty numeric(18,4);
  v_cost numeric(18,4);
begin
  if not private.has_permission(_company_id, 'purchase.manage') then
    raise exception 'Forbidden: purchase.manage required';
  end if;

  insert into public.purchase_records(
    company_id, supplier_id, branch_id, reference, purchase_date,
    total_amount, currency_code, status, notes, created_by
  ) values (
    _company_id, _supplier_id, _branch_id, _reference, coalesce(_purchase_date, current_date),
    0, coalesce(_currency,'NGN'), 'recorded', _notes, auth.uid()
  ) returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_cost := coalesce((v_item->>'unit_cost')::numeric, 0);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_pid;
    end if;
    v_line_total := v_qty * v_cost;
    v_total := v_total + v_line_total;

    insert into public.purchase_record_items(purchase_id, product_id, quantity, unit_cost, total)
    values (v_purchase_id, v_pid, v_qty, v_cost, v_line_total);

    insert into public.stock_movements(
      company_id, product_id, branch_id, movement_type, quantity,
      unit_cost, reference_type, reference_id, notes, created_by
    ) values (
      _company_id, v_pid, _branch_id, 'purchase', v_qty,
      v_cost, 'purchase_record', v_purchase_id, _notes, auth.uid()
    );
  end loop;

  update public.purchase_records set total_amount = v_total where id = v_purchase_id;
  return v_purchase_id;
end;
$$;

grant execute on function public.record_purchase_atomic(uuid,uuid,uuid,date,text,text,text,jsonb) to authenticated;

-- Seed default category when inventory module enabled
create or replace function public.seed_inventory_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.module_id = 'inventory' then
    insert into public.product_categories(company_id, name, description)
    values (new.company_id, 'Uncategorized', 'Default category')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger tr_seed_inventory_defaults
  after insert on public.company_modules
  for each row execute function public.seed_inventory_defaults();
