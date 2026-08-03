-- ============ ENUMS ============
create type public.expense_status as enum ('draft','pending','approved','rejected','paid');

-- ============ expense_categories ============
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.expense_categories(id) on delete set null,
  name text not null,
  description text,
  color text,
  icon text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index expense_categories_company_name_uidx
  on public.expense_categories (company_id, lower(name)) where deleted_at is null;

grant select, insert, update, delete on public.expense_categories to authenticated;
grant all on public.expense_categories to service_role;
alter table public.expense_categories enable row level security;

create policy "expense_categories_read" on public.expense_categories
  for select to authenticated using (private.is_company_member(company_id));
create policy "expense_categories_write" on public.expense_categories
  for all to authenticated
  using (private.has_permission(company_id, 'expense.update'))
  with check (private.has_permission(company_id, 'expense.update'));

-- ============ expenses ============
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  category_id uuid references public.expense_categories(id) on delete set null,
  expense_number text not null,
  title text not null,
  description text,
  amount numeric(18,4) not null check (amount >= 0),
  tax_amount numeric(18,4) not null default 0 check (tax_amount >= 0),
  total numeric(18,4) not null default 0 check (total >= 0),
  currency_code text not null default 'NGN' references public.currencies(code),
  expense_date date not null default current_date,
  payment_method public.payment_method,
  payment_status public.payment_status not null default 'pending',
  amount_paid numeric(18,4) not null default 0,
  status public.expense_status not null default 'draft',
  is_recurring boolean not null default false,
  recurrence text,
  vendor_name text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_id uuid references public.purchase_records(id) on delete set null,
  reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index expenses_company_number_uidx on public.expenses (company_id, expense_number);
create index expenses_company_date_idx on public.expenses (company_id, expense_date desc);
create index expenses_company_category_idx on public.expenses (company_id, category_id);
create index expenses_company_branch_idx on public.expenses (company_id, branch_id);

grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;

create policy "expenses_read" on public.expenses
  for select to authenticated using (private.is_company_member(company_id));
create policy "expenses_insert" on public.expenses
  for insert to authenticated with check (private.has_permission(company_id, 'expense.create'));
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (private.has_permission(company_id, 'expense.update'))
  with check (private.has_permission(company_id, 'expense.update'));
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (private.has_permission(company_id, 'expense.delete'));

-- ============ expense_attachments ============
create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index expense_attachments_expense_idx on public.expense_attachments (expense_id);

grant select, insert, delete on public.expense_attachments to authenticated;
grant all on public.expense_attachments to service_role;
alter table public.expense_attachments enable row level security;

create policy "expense_attachments_read" on public.expense_attachments
  for select to authenticated using (private.is_company_member(company_id));
create policy "expense_attachments_insert" on public.expense_attachments
  for insert to authenticated with check (private.has_permission(company_id, 'expense.create'));
create policy "expense_attachments_delete" on public.expense_attachments
  for delete to authenticated using (private.has_permission(company_id, 'expense.update'));

-- ============ expense_payments ============
create table public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  method public.payment_method not null default 'cash',
  amount numeric(18,4) not null check (amount > 0),
  currency_code text not null default 'NGN' references public.currencies(code),
  reference text,
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expense_payments_expense_idx on public.expense_payments (expense_id);

grant select, insert, update, delete on public.expense_payments to authenticated;
grant all on public.expense_payments to service_role;
alter table public.expense_payments enable row level security;

create policy "expense_payments_read" on public.expense_payments
  for select to authenticated using (private.is_company_member(company_id));
create policy "expense_payments_write" on public.expense_payments
  for all to authenticated
  using (private.has_permission(company_id, 'expense.update'))
  with check (private.has_permission(company_id, 'expense.update'));

-- ============ TRIGGERS ============
create trigger set_updated_at_expense_categories before update on public.expense_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at_expenses before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger set_updated_at_expense_payments before update on public.expense_payments
  for each row execute function public.set_updated_at();

create trigger audit_expense_categories after insert or update or delete on public.expense_categories
  for each row execute function public.audit_m2_change();
create trigger audit_expenses after insert or update or delete on public.expenses
  for each row execute function public.audit_m2_change();
create trigger audit_expense_payments after insert or update or delete on public.expense_payments
  for each row execute function public.audit_m2_change();

-- total = amount + tax_amount, kept authoritative in DB
create or replace function public.compute_expense_total()
returns trigger language plpgsql set search_path = public as $$
begin
  new.total := coalesce(new.amount,0) + coalesce(new.tax_amount,0);
  return new;
end;
$$;
create trigger compute_expense_total_trg before insert or update of amount, tax_amount
  on public.expenses for each row execute function public.compute_expense_total();

-- roll up expense payments onto the parent expense
create or replace function public.on_expense_payment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_expense_id uuid; v_paid numeric(18,4); v_total numeric(18,4); v_status public.expense_status;
begin
  v_expense_id := coalesce(new.expense_id, old.expense_id);
  select coalesce(sum(amount),0) into v_paid from public.expense_payments where expense_id = v_expense_id;
  select total, status into v_total, v_status from public.expenses where id = v_expense_id;
  update public.expenses
    set amount_paid = v_paid,
        payment_status = case
          when v_total is null or v_total = 0 then payment_status
          when v_paid <= 0 then 'pending'::public.payment_status
          when v_paid >= v_total then 'paid'::public.payment_status
          else 'partial'::public.payment_status
        end,
        status = case
          when v_total is not null and v_total > 0 and v_paid >= v_total and v_status <> 'rejected'
            then 'paid'::public.expense_status
          else status
        end
    where id = v_expense_id;
  return coalesce(new, old);
end;
$$;
create trigger on_expense_payment_change_trg
  after insert or update or delete on public.expense_payments
  for each row execute function public.on_expense_payment_change();

-- ============ DEFAULT CATEGORIES ON MODULE ENABLE ============
create or replace function public.seed_expense_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.module_id = 'expenses' then
    insert into public.expense_categories (company_id, name, description, icon, is_system)
    values
      (new.company_id, 'Operations', 'Day-to-day operating costs', 'settings', true),
      (new.company_id, 'Utilities', 'Electricity, water, internet, fuel', 'zap', true),
      (new.company_id, 'Staff', 'Salaries, wages, allowances', 'users', true),
      (new.company_id, 'Marketing', 'Advertising and promotions', 'megaphone', true),
      (new.company_id, 'Transport', 'Logistics, delivery, travel', 'truck', true),
      (new.company_id, 'Maintenance', 'Repairs and servicing', 'wrench', true)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger seed_expense_defaults_trg after insert on public.company_modules
  for each row execute function public.seed_expense_defaults();

-- ============ PERMISSIONS ============
insert into public.permissions (key, module, description) values
  ('expense.view',    'expenses', 'View expenses and expense reports'),
  ('expense.create',  'expenses', 'Record new expenses'),
  ('expense.update',  'expenses', 'Edit expenses, categories and payments'),
  ('expense.delete',  'expenses', 'Delete expenses'),
  ('expense.approve', 'expenses', 'Approve or reject expenses')
on conflict (key) do nothing;

-- attach to template roles AND every existing company role
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','expense.view'),('owner','expense.create'),('owner','expense.update'),('owner','expense.delete'),('owner','expense.approve'),
  ('admin','expense.view'),('admin','expense.create'),('admin','expense.update'),('admin','expense.delete'),('admin','expense.approve'),
  ('manager','expense.view'),('manager','expense.create'),('manager','expense.update'),('manager','expense.approve'),
  ('staff','expense.view')
) as p(role_key, key)
where r.key = p.role_key
on conflict do nothing;