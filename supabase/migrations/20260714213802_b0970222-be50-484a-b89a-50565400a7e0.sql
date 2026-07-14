
create type public.sale_status as enum ('draft','completed','cancelled');
create type public.order_status as enum ('draft','pending','confirmed','completed','cancelled');
create type public.return_status as enum ('draft','approved','completed','rejected');
create type public.return_type as enum ('full','partial','damaged');
create type public.payment_method as enum ('cash','transfer','card','split','other');
create type public.payment_status as enum ('pending','partial','paid','refunded','failed');
create type public.discount_type as enum ('percentage','fixed');
create type public.sale_channel as enum ('walk_in','online','whatsapp','phone','external_pos');

create table public.document_sequences (
  company_id uuid not null references public.companies(id) on delete cascade,
  prefix text not null,
  last_value bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, prefix)
);
grant select, insert, update on public.document_sequences to authenticated;
grant all on public.document_sequences to service_role;
alter table public.document_sequences enable row level security;
create policy seq_member_read on public.document_sequences for select to authenticated
  using (private.is_company_member(company_id));

create or replace function public.next_document_number(_company_id uuid, _prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare v_next bigint;
begin
  insert into public.document_sequences(company_id, prefix, last_value)
    values (_company_id, _prefix, 1)
    on conflict (company_id, prefix)
    do update set last_value = document_sequences.last_value + 1, updated_at = now()
    returning last_value into v_next;
  return _prefix || '-' || lpad(v_next::text, 6, '0');
end;
$$;

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  name text not null,
  discount_type public.discount_type not null,
  value numeric(18,4) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  min_subtotal numeric(18,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index discounts_company_code_uk on public.discounts(company_id, code) where code is not null and deleted_at is null;
grant select, insert, update, delete on public.discounts to authenticated;
grant all on public.discounts to service_role;
alter table public.discounts enable row level security;
create policy discounts_read on public.discounts for select to authenticated
  using (private.is_company_member(company_id));
create policy discounts_write on public.discounts for all to authenticated
  using (private.is_company_member(company_id) and private.has_permission(company_id, 'discount.manage'))
  with check (private.is_company_member(company_id) and private.has_permission(company_id, 'discount.manage'));

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  sale_number text not null,
  customer_id uuid,
  channel public.sale_channel not null default 'walk_in',
  status public.sale_status not null default 'draft',
  subtotal numeric(18,4) not null default 0,
  discount_total numeric(18,4) not null default 0,
  tax_total numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0,
  currency_code text not null default 'NGN',
  payment_status public.payment_status not null default 'pending',
  amount_paid numeric(18,4) not null default 0,
  notes text,
  external_reference text,
  discount_id uuid references public.discounts(id),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, sale_number)
);
grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy sales_read on public.sales for select to authenticated
  using (private.is_company_member(company_id));
create policy sales_insert on public.sales for insert to authenticated
  with check (private.is_company_member(company_id) and private.has_permission(company_id, 'sales.create'));
create policy sales_update on public.sales for update to authenticated
  using (private.is_company_member(company_id) and (private.has_permission(company_id, 'sales.create') or private.has_permission(company_id, 'sales.complete') or private.has_permission(company_id, 'sales.cancel')))
  with check (private.is_company_member(company_id));
create policy sales_delete on public.sales for delete to authenticated
  using (private.is_company_member(company_id) and private.has_permission(company_id, 'sales.cancel'));

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(18,4) not null default 0,
  discount numeric(18,4) not null default 0,
  tax_rate numeric(18,4) not null default 0,
  tax_amount numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sale_items to authenticated;
grant all on public.sale_items to service_role;
alter table public.sale_items enable row level security;
create policy sale_items_all on public.sale_items for all to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_items.sale_id and private.is_company_member(s.company_id)))
  with check (exists (select 1 from public.sales s where s.id = sale_items.sale_id and private.is_company_member(s.company_id)));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  order_number text not null,
  customer_id uuid,
  channel public.sale_channel not null default 'walk_in',
  status public.order_status not null default 'draft',
  subtotal numeric(18,4) not null default 0,
  discount_total numeric(18,4) not null default 0,
  tax_total numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0,
  currency_code text not null default 'NGN',
  expected_at timestamptz,
  notes text,
  external_reference text,
  sale_id uuid references public.sales(id),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, order_number)
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy orders_read on public.orders for select to authenticated
  using (private.is_company_member(company_id));
create policy orders_write on public.orders for all to authenticated
  using (private.is_company_member(company_id) and private.has_permission(company_id, 'order.manage'))
  with check (private.is_company_member(company_id) and private.has_permission(company_id, 'order.manage'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(18,4) not null default 0,
  discount numeric(18,4) not null default 0,
  tax_amount numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy order_items_all on public.order_items for all to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and private.is_company_member(o.company_id)))
  with check (exists (select 1 from public.orders o where o.id = order_items.order_id and private.is_company_member(o.company_id)));

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  return_number text not null,
  sale_id uuid not null references public.sales(id),
  customer_id uuid,
  return_type public.return_type not null default 'partial',
  status public.return_status not null default 'draft',
  reason text,
  subtotal numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0,
  currency_code text not null default 'NGN',
  restock boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, return_number)
);
grant select, insert, update, delete on public.returns to authenticated;
grant all on public.returns to service_role;
alter table public.returns enable row level security;
create policy returns_read on public.returns for select to authenticated
  using (private.is_company_member(company_id));
create policy returns_write on public.returns for all to authenticated
  using (private.is_company_member(company_id) and private.has_permission(company_id, 'return.manage'))
  with check (private.is_company_member(company_id) and private.has_permission(company_id, 'return.manage'));

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id),
  product_id uuid not null references public.products(id),
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(18,4) not null default 0,
  total numeric(18,4) not null default 0,
  condition text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.return_items to authenticated;
grant all on public.return_items to service_role;
alter table public.return_items enable row level security;
create policy return_items_all on public.return_items for all to authenticated
  using (exists (select 1 from public.returns r where r.id = return_items.return_id and private.is_company_member(r.company_id)))
  with check (exists (select 1 from public.returns r where r.id = return_items.return_id and private.is_company_member(r.company_id)));

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  method public.payment_method not null default 'cash',
  status public.payment_status not null default 'paid',
  amount numeric(18,4) not null,
  currency_code text not null default 'NGN',
  reference text,
  provider text,
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sale_id is not null or order_id is not null)
);
grant select, insert, update, delete on public.payment_records to authenticated;
grant all on public.payment_records to service_role;
alter table public.payment_records enable row level security;
create policy payments_read on public.payment_records for select to authenticated
  using (private.is_company_member(company_id));
create policy payments_write on public.payment_records for all to authenticated
  using (private.is_company_member(company_id) and private.has_permission(company_id, 'payment.record'))
  with check (private.is_company_member(company_id) and private.has_permission(company_id, 'payment.record'));

create trigger discounts_touch before update on public.discounts for each row execute function public.set_updated_at();
create trigger sales_touch before update on public.sales for each row execute function public.set_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.set_updated_at();
create trigger returns_touch before update on public.returns for each row execute function public.set_updated_at();
create trigger payments_touch before update on public.payment_records for each row execute function public.set_updated_at();

create trigger discounts_audit after insert or update or delete on public.discounts for each row execute function public.audit_m2_change();
create trigger sales_audit after insert or update or delete on public.sales for each row execute function public.audit_m2_change();
create trigger orders_audit after insert or update or delete on public.orders for each row execute function public.audit_m2_change();
create trigger returns_audit after insert or update or delete on public.returns for each row execute function public.audit_m2_change();
create trigger payments_audit after insert or update or delete on public.payment_records for each row execute function public.audit_m2_change();

insert into public.permissions (key, module, description) values
  ('sales.view', 'sales', 'View sales'),
  ('sales.create', 'sales', 'Create draft sales'),
  ('sales.complete', 'sales', 'Complete sales'),
  ('sales.cancel', 'sales', 'Cancel sales'),
  ('order.view', 'sales', 'View orders'),
  ('order.manage', 'sales', 'Create and update orders'),
  ('return.view', 'sales', 'View returns'),
  ('return.manage', 'sales', 'Create and process returns'),
  ('payment.view', 'sales', 'View payments'),
  ('payment.record', 'sales', 'Record payments'),
  ('discount.manage', 'sales', 'Manage discounts')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('sales.view'), ('sales.create'), ('sales.complete'), ('sales.cancel'),
  ('order.view'), ('order.manage'),
  ('return.view'), ('return.manage'),
  ('payment.view'), ('payment.record'),
  ('discount.manage')
) as p(key)
where r.key in ('owner','admin')
on conflict do nothing;

create or replace function public.recompute_sale_totals(_sale_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sub numeric(18,4); v_tax numeric(18,4); v_line_disc numeric(18,4); v_disc numeric(18,4);
begin
  select coalesce(sum(quantity * unit_price), 0),
         coalesce(sum(tax_amount), 0),
         coalesce(sum(discount), 0)
    into v_sub, v_tax, v_line_disc
    from public.sale_items where sale_id = _sale_id;
  select coalesce(discount_total, 0) into v_disc from public.sales where id = _sale_id;
  update public.sales
    set subtotal = v_sub,
        tax_total = v_tax,
        discount_total = greatest(v_line_disc, v_disc),
        total = greatest(v_sub - greatest(v_line_disc, v_disc) + v_tax, 0)
    where id = _sale_id;
end;
$$;

create or replace function public.complete_sale_atomic(_sale_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_sale public.sales%rowtype; v_item record; v_inventory_on boolean;
begin
  select * into v_sale from public.sales where id = _sale_id for update;
  if v_sale.id is null then raise exception 'Sale not found'; end if;
  if v_sale.status <> 'draft' then raise exception 'Sale is not in draft status'; end if;
  if not private.has_permission(v_sale.company_id, 'sales.complete') then
    raise exception 'Forbidden: sales.complete required';
  end if;

  perform public.recompute_sale_totals(_sale_id);
  select * into v_sale from public.sales where id = _sale_id;

  select exists(
    select 1 from public.company_modules
     where company_id = v_sale.company_id and module_id = 'inventory' and enabled = true
  ) into v_inventory_on;

  if v_inventory_on then
    for v_item in select product_id, quantity from public.sale_items where sale_id = _sale_id loop
      insert into public.stock_movements(
        company_id, product_id, branch_id, movement_type, quantity,
        reference_type, reference_id, created_by
      ) values (
        v_sale.company_id, v_item.product_id, v_sale.branch_id, 'sale', v_item.quantity,
        'sale', v_sale.id, auth.uid()
      );
    end loop;
  end if;

  update public.sales
    set status = 'completed',
        completed_at = now(),
        payment_status = case
          when amount_paid >= total and total > 0 then 'paid'::public.payment_status
          when amount_paid > 0 then 'partial'::public.payment_status
          else 'pending'::public.payment_status
        end
    where id = _sale_id;

  insert into public.event_queue(company_id, event_key, version, payload, status, next_run_at)
    values (v_sale.company_id, 'sale.completed', 1,
      jsonb_build_object('companyId', v_sale.company_id, 'saleId', v_sale.id, 'total', v_sale.total),
      'queued', now());

  return _sale_id;
end;
$$;

create or replace function public.cancel_sale(_sale_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_sale public.sales%rowtype;
begin
  select * into v_sale from public.sales where id = _sale_id for update;
  if v_sale.id is null then raise exception 'Sale not found'; end if;
  if not private.has_permission(v_sale.company_id, 'sales.cancel') then
    raise exception 'Forbidden: sales.cancel required';
  end if;
  if v_sale.status = 'completed' then
    raise exception 'Completed sales must be returned, not cancelled';
  end if;
  update public.sales
    set status = 'cancelled', cancelled_at = now(),
        notes = coalesce(_reason, notes)
    where id = _sale_id;
  insert into public.event_queue(company_id, event_key, version, payload, status, next_run_at)
    values (v_sale.company_id, 'sale.cancelled', 1,
      jsonb_build_object('companyId', v_sale.company_id, 'saleId', v_sale.id),
      'queued', now());
end;
$$;

create or replace function public.record_return_atomic(_return_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ret public.returns%rowtype; v_item record; v_inventory_on boolean;
        v_sale_total numeric(18,4); v_ret_total numeric(18,4);
begin
  select * into v_ret from public.returns where id = _return_id for update;
  if v_ret.id is null then raise exception 'Return not found'; end if;
  if v_ret.status = 'completed' then raise exception 'Return already completed'; end if;
  if not private.has_permission(v_ret.company_id, 'return.manage') then
    raise exception 'Forbidden: return.manage required';
  end if;

  select exists(
    select 1 from public.company_modules
     where company_id = v_ret.company_id and module_id = 'inventory' and enabled = true
  ) into v_inventory_on;

  if v_inventory_on and v_ret.restock then
    for v_item in select product_id, quantity from public.return_items where return_id = _return_id loop
      insert into public.stock_movements(
        company_id, product_id, branch_id, movement_type, quantity,
        reference_type, reference_id, created_by
      ) values (
        v_ret.company_id, v_item.product_id, v_ret.branch_id, 'return', v_item.quantity,
        'return', v_ret.id, auth.uid()
      );
    end loop;
  end if;

  select total into v_sale_total from public.sales where id = v_ret.sale_id;
  select coalesce(sum(total), 0) into v_ret_total from public.returns
    where sale_id = v_ret.sale_id and status = 'completed';
  v_ret_total := v_ret_total + v_ret.total;

  update public.returns set status = 'completed' where id = _return_id;

  update public.sales
    set payment_status = case
      when v_ret_total >= v_sale_total then 'refunded'::public.payment_status
      else payment_status
    end
    where id = v_ret.sale_id;

  insert into public.event_queue(company_id, event_key, version, payload, status, next_run_at)
    values (v_ret.company_id, 'sale.returned', 1,
      jsonb_build_object('companyId', v_ret.company_id, 'saleId', v_ret.sale_id, 'returnId', v_ret.id, 'total', v_ret.total),
      'queued', now());

  return _return_id;
end;
$$;

create or replace function public.on_payment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sale_id uuid; v_paid numeric(18,4); v_total numeric(18,4);
begin
  v_sale_id := coalesce(new.sale_id, old.sale_id);
  if v_sale_id is null then return coalesce(new, old); end if;
  select coalesce(sum(amount), 0) into v_paid from public.payment_records where sale_id = v_sale_id;
  select total into v_total from public.sales where id = v_sale_id;
  update public.sales
    set amount_paid = v_paid,
        payment_status = case
          when v_total is null or v_total = 0 then payment_status
          when v_paid <= 0 then 'pending'::public.payment_status
          when v_paid >= v_total then 'paid'::public.payment_status
          else 'partial'::public.payment_status
        end
    where id = v_sale_id;
  if tg_op = 'INSERT' and new.sale_id is not null then
    insert into public.event_queue(company_id, event_key, version, payload, status, next_run_at)
      values (new.company_id, 'payment.received', 1,
        jsonb_build_object('companyId', new.company_id, 'saleId', new.sale_id, 'amount', new.amount, 'method', new.method),
        'queued', now());
  end if;
  return coalesce(new, old);
end;
$$;

create trigger payments_sync
after insert or update or delete on public.payment_records
for each row execute function public.on_payment_change();
