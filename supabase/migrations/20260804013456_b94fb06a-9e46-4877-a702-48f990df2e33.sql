-- ============================================================
-- MILESTONE 8 — PEOPLE & ORGANIZATION ENGINE
-- ============================================================

create type public.employment_status as enum ('active','probation','suspended','on_leave','terminated','resigned');
create type public.employment_type as enum ('full_time','part_time','contract','intern','casual','volunteer');
create type public.attendance_status as enum ('present','absent','late','half_day','on_leave','holiday');
create type public.attendance_source as enum ('clock','manual','import','correction');
create type public.leave_type as enum ('annual','sick','unpaid','maternity','paternity','compassionate','study','other');
create type public.leave_status as enum ('draft','pending','approved','rejected','cancelled');
create type public.payroll_status as enum ('draft','processing','pending_approval','approved','paid','cancelled');
create type public.review_status as enum ('draft','in_progress','submitted','completed','cancelled');
create type public.shift_type as enum ('morning','afternoon','night','custom');
create type public.position_status as enum ('draft','open','on_hold','closed','filled');
create type public.candidate_status as enum ('applied','screening','interview','offer','hired','rejected','withdrawn');
create type public.employee_document_type as enum ('contract','id_card','certificate','resume','offer_letter','appraisal','other');

-- ============ departments ============
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  parent_id uuid references public.departments(id) on delete set null,
  name text not null,
  code text,
  description text,
  manager_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index departments_company_name_uidx
  on public.departments (company_id, lower(name)) where deleted_at is null;
create index departments_company_branch_idx on public.departments (company_id, branch_id);

grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "departments_read" on public.departments
  for select to authenticated using (private.is_company_member(company_id));
create policy "departments_write" on public.departments
  for all to authenticated
  using (private.has_permission(company_id, 'employee.manage'))
  with check (private.has_permission(company_id, 'employee.manage'));

-- ============ job_positions ============
create table public.job_positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  code text,
  description text,
  requirements text,
  employment_type public.employment_type not null default 'full_time',
  openings integer not null default 1 check (openings >= 0),
  min_salary numeric(18,4),
  max_salary numeric(18,4),
  currency_code text not null default 'NGN' references public.currencies(code),
  status public.position_status not null default 'draft',
  opened_at date,
  closed_at date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index job_positions_company_status_idx on public.job_positions (company_id, status);

grant select, insert, update, delete on public.job_positions to authenticated;
grant all on public.job_positions to service_role;
alter table public.job_positions enable row level security;
create policy "job_positions_read" on public.job_positions
  for select to authenticated using (private.is_company_member(company_id));
create policy "job_positions_write" on public.job_positions
  for all to authenticated
  using (private.has_permission(company_id, 'recruitment.manage'))
  with check (private.has_permission(company_id, 'recruitment.manage'));

-- ============ employees ============
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  position_id uuid references public.job_positions(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  employee_number text not null,
  first_name text not null,
  last_name text not null,
  middle_name text,
  email text,
  phone text,
  gender text,
  date_of_birth date,
  address jsonb,
  job_title text,
  employment_type public.employment_type not null default 'full_time',
  status public.employment_status not null default 'active',
  hired_at date not null default current_date,
  probation_ends_at date,
  terminated_at date,
  termination_reason text,
  base_salary numeric(18,4) not null default 0 check (base_salary >= 0),
  pay_frequency text not null default 'monthly',
  currency_code text not null default 'NGN' references public.currencies(code),
  bank_details jsonb,
  emergency_contact jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index employees_company_number_uidx on public.employees (company_id, employee_number);
create index employees_company_status_idx on public.employees (company_id, status);
create index employees_company_branch_idx on public.employees (company_id, branch_id);
create index employees_company_dept_idx on public.employees (company_id, department_id);
create index employees_user_idx on public.employees (user_id);

alter table public.departments
  add constraint departments_manager_fk foreign key (manager_id)
  references public.employees(id) on delete set null;

grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;

-- helper: current user's employee row in a company
create or replace function private.is_self_employee(_employee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees e
    where e.id = _employee_id and e.user_id = auth.uid()
  )
$$;

create policy "employees_read" on public.employees
  for select to authenticated using (
    (private.is_company_member(company_id) and private.has_permission(company_id, 'employee.view'))
    or user_id = auth.uid()
  );
create policy "employees_write" on public.employees
  for all to authenticated
  using (private.has_permission(company_id, 'employee.manage'))
  with check (private.has_permission(company_id, 'employee.manage'));

-- ============ employee_documents ============
create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  document_type public.employee_document_type not null default 'other',
  file_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  issued_at date,
  expires_at date,
  notes text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employee_documents_employee_idx on public.employee_documents (employee_id);

grant select, insert, update, delete on public.employee_documents to authenticated;
grant all on public.employee_documents to service_role;
alter table public.employee_documents enable row level security;
create policy "employee_documents_read" on public.employee_documents
  for select to authenticated using (
    private.has_permission(company_id, 'employee.view') or private.is_self_employee(employee_id)
  );
create policy "employee_documents_write" on public.employee_documents
  for all to authenticated
  using (private.has_permission(company_id, 'employee.manage'))
  with check (private.has_permission(company_id, 'employee.manage'));

-- ============ attendance_records ============
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  worked_minutes integer not null default 0 check (worked_minutes >= 0),
  break_minutes integer not null default 0 check (break_minutes >= 0),
  status public.attendance_status not null default 'present',
  source public.attendance_source not null default 'clock',
  notes text,
  correction_of uuid references public.attendance_records(id) on delete set null,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index attendance_employee_date_uidx
  on public.attendance_records (employee_id, work_date) where correction_of is null;
create index attendance_company_date_idx on public.attendance_records (company_id, work_date desc);
create index attendance_company_branch_idx on public.attendance_records (company_id, branch_id);

grant select, insert, update, delete on public.attendance_records to authenticated;
grant all on public.attendance_records to service_role;
alter table public.attendance_records enable row level security;
create policy "attendance_read" on public.attendance_records
  for select to authenticated using (
    private.has_permission(company_id, 'employee.view') or private.is_self_employee(employee_id)
  );
create policy "attendance_self_insert" on public.attendance_records
  for insert to authenticated with check (
    private.has_permission(company_id, 'attendance.manage') or private.is_self_employee(employee_id)
  );
create policy "attendance_update" on public.attendance_records
  for update to authenticated
  using (private.has_permission(company_id, 'attendance.manage'))
  with check (private.has_permission(company_id, 'attendance.manage'));
create policy "attendance_delete" on public.attendance_records
  for delete to authenticated using (private.has_permission(company_id, 'attendance.manage'));

-- ============ leave_requests ============
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type public.leave_type not null default 'annual',
  status public.leave_status not null default 'pending',
  start_date date not null,
  end_date date not null,
  days numeric(6,2) not null default 0 check (days >= 0),
  reason text,
  decision_notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leave_requests_company_status_idx on public.leave_requests (company_id, status);
create index leave_requests_employee_idx on public.leave_requests (employee_id, start_date desc);

grant select, insert, update, delete on public.leave_requests to authenticated;
grant all on public.leave_requests to service_role;
alter table public.leave_requests enable row level security;
create policy "leave_read" on public.leave_requests
  for select to authenticated using (
    private.has_permission(company_id, 'employee.view') or private.is_self_employee(employee_id)
  );
create policy "leave_insert" on public.leave_requests
  for insert to authenticated with check (
    private.has_permission(company_id, 'leave.manage') or private.is_self_employee(employee_id)
  );
create policy "leave_update" on public.leave_requests
  for update to authenticated
  using (private.has_permission(company_id, 'leave.manage'))
  with check (private.has_permission(company_id, 'leave.manage'));
create policy "leave_delete" on public.leave_requests
  for delete to authenticated using (private.has_permission(company_id, 'leave.manage'));

-- validation: end >= start (trigger, not CHECK, to stay flexible)
create or replace function public.validate_leave_dates()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.end_date < new.start_date then
    raise exception 'Leave end date cannot be before the start date';
  end if;
  if coalesce(new.days,0) = 0 then
    new.days := (new.end_date - new.start_date) + 1;
  end if;
  return new;
end;
$$;
create trigger validate_leave_dates_trg before insert or update on public.leave_requests
  for each row execute function public.validate_leave_dates();

-- ============ payroll_cycles ============
create table public.payroll_cycles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  period_start date not null,
  period_end date not null,
  pay_date date,
  currency_code text not null default 'NGN' references public.currencies(code),
  status public.payroll_status not null default 'draft',
  total_gross numeric(18,4) not null default 0,
  total_deductions numeric(18,4) not null default 0,
  total_net numeric(18,4) not null default 0,
  notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payroll_cycles_company_period_idx on public.payroll_cycles (company_id, period_start desc);

grant select, insert, update, delete on public.payroll_cycles to authenticated;
grant all on public.payroll_cycles to service_role;
alter table public.payroll_cycles enable row level security;
create policy "payroll_cycles_read" on public.payroll_cycles
  for select to authenticated using (private.has_permission(company_id, 'payroll.manage'));
create policy "payroll_cycles_write" on public.payroll_cycles
  for all to authenticated
  using (private.has_permission(company_id, 'payroll.manage'))
  with check (private.has_permission(company_id, 'payroll.manage'));

-- ============ payroll_items ============
create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cycle_id uuid not null references public.payroll_cycles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  base_salary numeric(18,4) not null default 0 check (base_salary >= 0),
  allowances jsonb not null default '[]'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  allowance_total numeric(18,4) not null default 0 check (allowance_total >= 0),
  deduction_total numeric(18,4) not null default 0 check (deduction_total >= 0),
  gross_pay numeric(18,4) not null default 0,
  net_pay numeric(18,4) not null default 0,
  currency_code text not null default 'NGN' references public.currencies(code),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payroll_items_cycle_employee_uidx on public.payroll_items (cycle_id, employee_id);
create index payroll_items_company_idx on public.payroll_items (company_id);

grant select, insert, update, delete on public.payroll_items to authenticated;
grant all on public.payroll_items to service_role;
alter table public.payroll_items enable row level security;
create policy "payroll_items_read" on public.payroll_items
  for select to authenticated using (
    private.has_permission(company_id, 'payroll.manage') or private.is_self_employee(employee_id)
  );
create policy "payroll_items_write" on public.payroll_items
  for all to authenticated
  using (private.has_permission(company_id, 'payroll.manage'))
  with check (private.has_permission(company_id, 'payroll.manage'));

-- payroll item totals + cycle roll-up
create or replace function public.compute_payroll_item_totals()
returns trigger language plpgsql set search_path = public as $$
begin
  new.gross_pay := coalesce(new.base_salary,0) + coalesce(new.allowance_total,0);
  new.net_pay := new.gross_pay - coalesce(new.deduction_total,0);
  return new;
end;
$$;
create trigger compute_payroll_item_totals_trg before insert or update
  on public.payroll_items for each row execute function public.compute_payroll_item_totals();

create or replace function public.rollup_payroll_cycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cycle uuid;
begin
  v_cycle := coalesce(new.cycle_id, old.cycle_id);
  update public.payroll_cycles c
     set total_gross = t.gross, total_deductions = t.ded, total_net = t.net
    from (
      select coalesce(sum(gross_pay),0) gross,
             coalesce(sum(deduction_total),0) ded,
             coalesce(sum(net_pay),0) net
        from public.payroll_items where cycle_id = v_cycle
    ) t
   where c.id = v_cycle;
  return coalesce(new, old);
end;
$$;
create trigger rollup_payroll_cycle_trg after insert or update or delete
  on public.payroll_items for each row execute function public.rollup_payroll_cycle();

-- ============ performance_reviews ============
create table public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  reviewer_id uuid references public.employees(id) on delete set null,
  title text not null,
  period_start date not null,
  period_end date not null,
  status public.review_status not null default 'draft',
  goals jsonb not null default '[]'::jsonb,
  ratings jsonb not null default '{}'::jsonb,
  overall_rating numeric(4,2) check (overall_rating >= 0 and overall_rating <= 5),
  manager_comments text,
  employee_comments text,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index performance_reviews_company_idx on public.performance_reviews (company_id, period_end desc);
create index performance_reviews_employee_idx on public.performance_reviews (employee_id);

grant select, insert, update, delete on public.performance_reviews to authenticated;
grant all on public.performance_reviews to service_role;
alter table public.performance_reviews enable row level security;
create policy "performance_reviews_read" on public.performance_reviews
  for select to authenticated using (
    private.has_permission(company_id, 'performance.manage') or private.is_self_employee(employee_id)
  );
create policy "performance_reviews_self_update" on public.performance_reviews
  for update to authenticated
  using (private.has_permission(company_id, 'performance.manage') or private.is_self_employee(employee_id))
  with check (private.has_permission(company_id, 'performance.manage') or private.is_self_employee(employee_id));
create policy "performance_reviews_insert" on public.performance_reviews
  for insert to authenticated with check (private.has_permission(company_id, 'performance.manage'));
create policy "performance_reviews_delete" on public.performance_reviews
  for delete to authenticated using (private.has_permission(company_id, 'performance.manage'));

-- ============ shift_schedules ============
create table public.shift_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  employee_id uuid references public.employees(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  shift_type public.shift_type not null default 'morning',
  name text,
  shift_date date not null,
  starts_at time not null,
  ends_at time not null,
  notes text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shift_schedules_company_date_idx on public.shift_schedules (company_id, shift_date);
create index shift_schedules_employee_date_idx on public.shift_schedules (employee_id, shift_date);

grant select, insert, update, delete on public.shift_schedules to authenticated;
grant all on public.shift_schedules to service_role;
alter table public.shift_schedules enable row level security;
create policy "shift_schedules_read" on public.shift_schedules
  for select to authenticated using (
    private.is_company_member(company_id)
    and (private.has_permission(company_id, 'employee.view')
         or (employee_id is not null and private.is_self_employee(employee_id)))
  );
create policy "shift_schedules_write" on public.shift_schedules
  for all to authenticated
  using (private.has_permission(company_id, 'attendance.manage'))
  with check (private.has_permission(company_id, 'attendance.manage'));

-- ============ recruitment_candidates ============
create table public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  position_id uuid references public.job_positions(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  source text,
  resume_path text,
  status public.candidate_status not null default 'applied',
  interview_at timestamptz,
  interview_notes text,
  rating numeric(4,2) check (rating >= 0 and rating <= 5),
  expected_salary numeric(18,4),
  currency_code text not null default 'NGN' references public.currencies(code),
  hired_employee_id uuid references public.employees(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recruitment_candidates_company_status_idx on public.recruitment_candidates (company_id, status);
create index recruitment_candidates_position_idx on public.recruitment_candidates (position_id);

grant select, insert, update, delete on public.recruitment_candidates to authenticated;
grant all on public.recruitment_candidates to service_role;
alter table public.recruitment_candidates enable row level security;
create policy "recruitment_candidates_read" on public.recruitment_candidates
  for select to authenticated using (private.has_permission(company_id, 'recruitment.manage'));
create policy "recruitment_candidates_write" on public.recruitment_candidates
  for all to authenticated
  using (private.has_permission(company_id, 'recruitment.manage'))
  with check (private.has_permission(company_id, 'recruitment.manage'));

-- ============ TIMESTAMPS ============
create trigger set_updated_at_departments before update on public.departments
  for each row execute function public.set_updated_at();
create trigger set_updated_at_job_positions before update on public.job_positions
  for each row execute function public.set_updated_at();
create trigger set_updated_at_employees before update on public.employees
  for each row execute function public.set_updated_at();
create trigger set_updated_at_employee_documents before update on public.employee_documents
  for each row execute function public.set_updated_at();
create trigger set_updated_at_attendance_records before update on public.attendance_records
  for each row execute function public.set_updated_at();
create trigger set_updated_at_leave_requests before update on public.leave_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at_payroll_cycles before update on public.payroll_cycles
  for each row execute function public.set_updated_at();
create trigger set_updated_at_payroll_items before update on public.payroll_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at_performance_reviews before update on public.performance_reviews
  for each row execute function public.set_updated_at();
create trigger set_updated_at_shift_schedules before update on public.shift_schedules
  for each row execute function public.set_updated_at();
create trigger set_updated_at_recruitment_candidates before update on public.recruitment_candidates
  for each row execute function public.set_updated_at();

-- ============ AUDIT ============
create trigger audit_departments after insert or update or delete on public.departments
  for each row execute function public.audit_m2_change();
create trigger audit_job_positions after insert or update or delete on public.job_positions
  for each row execute function public.audit_m2_change();
create trigger audit_employees after insert or update or delete on public.employees
  for each row execute function public.audit_m2_change();
create trigger audit_employee_documents after insert or update or delete on public.employee_documents
  for each row execute function public.audit_m2_change();
create trigger audit_attendance_records after insert or update or delete on public.attendance_records
  for each row execute function public.audit_m2_change();
create trigger audit_leave_requests after insert or update or delete on public.leave_requests
  for each row execute function public.audit_m2_change();
create trigger audit_payroll_cycles after insert or update or delete on public.payroll_cycles
  for each row execute function public.audit_m2_change();
create trigger audit_payroll_items after insert or update or delete on public.payroll_items
  for each row execute function public.audit_m2_change();
create trigger audit_performance_reviews after insert or update or delete on public.performance_reviews
  for each row execute function public.audit_m2_change();
create trigger audit_shift_schedules after insert or update or delete on public.shift_schedules
  for each row execute function public.audit_m2_change();
create trigger audit_recruitment_candidates after insert or update or delete on public.recruitment_candidates
  for each row execute function public.audit_m2_change();

-- ============ DEFAULT DEPARTMENTS ON MODULE ENABLE ============
create or replace function public.seed_people_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.module_id = 'people' then
    insert into public.departments (company_id, name, description)
    values
      (new.company_id, 'Management', 'Leadership and administration'),
      (new.company_id, 'Operations', 'Day-to-day business operations'),
      (new.company_id, 'Sales', 'Sales and customer facing staff'),
      (new.company_id, 'Finance', 'Accounts and finance'),
      (new.company_id, 'Support', 'Support and back office')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger seed_people_defaults_trg after insert on public.company_modules
  for each row execute function public.seed_people_defaults();

-- ============ PERMISSIONS ============
insert into public.permissions (key, module, description) values
  ('employee.view',       'people', 'View employees and people records'),
  ('employee.manage',     'people', 'Create and edit employees and departments'),
  ('attendance.manage',   'people', 'Manage attendance records and shift schedules'),
  ('leave.manage',        'people', 'Approve and manage leave requests'),
  ('payroll.manage',      'people', 'Manage payroll cycles and payroll items'),
  ('performance.manage',  'people', 'Manage performance reviews'),
  ('recruitment.manage',  'people', 'Manage job positions and candidates')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','employee.view'),('owner','employee.manage'),('owner','attendance.manage'),('owner','leave.manage'),('owner','payroll.manage'),('owner','performance.manage'),('owner','recruitment.manage'),
  ('admin','employee.view'),('admin','employee.manage'),('admin','attendance.manage'),('admin','leave.manage'),('admin','payroll.manage'),('admin','performance.manage'),('admin','recruitment.manage'),
  ('manager','employee.view'),('manager','attendance.manage'),('manager','leave.manage'),('manager','performance.manage'),('manager','recruitment.manage'),
  ('staff','employee.view')
) as p(role_key, key)
where r.key = p.role_key
on conflict do nothing;