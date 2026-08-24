-- ============================================================
-- MILESTONE 14 — INTEGRATIONS & DEVELOPER PLATFORM
-- ============================================================

-- ---------------------------- ENUMS -------------------------
do $$ begin create type public.integration_category as enum ('payments','pos','accounting','communication','e_commerce','logistics','storage','analytics','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.integration_status as enum ('draft','active','paused','error','deprecated'); exception when duplicate_object then null; end $$;
do $$ begin create type public.api_key_status as enum ('active','revoked','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.webhook_status as enum ('active','paused','error'); exception when duplicate_object then null; end $$;
do $$ begin create type public.delivery_status as enum ('pending','delivered','failed','retrying'); exception when duplicate_object then null; end $$;
do $$ begin create type public.oauth_status as enum ('connected','disconnected','error','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sync_status as enum ('idle','running','completed','failed','partial'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sync_direction as enum ('push','pull','two_way'); exception when duplicate_object then null; end $$;
do $$ begin create type public.import_status as enum ('pending','processing','completed','failed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.import_format as enum ('csv','excel','json'); exception when duplicate_object then null; end $$;
do $$ begin create type public.export_format as enum ('csv','excel','json'); exception when duplicate_object then null; end $$;

-- --------------------- INTEGRATION REGISTRY ------------------
create table public.integration_registries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  category public.integration_category not null default 'other',
  description text,
  logo_url text,
  status public.integration_status not null default 'draft',
  required_permissions jsonb not null default '[]'::jsonb,
  supported_capabilities jsonb not null default '[]'::jsonb,
  config_requirements jsonb not null default '{}'::jsonb,
  adapter_class text,
  is_built_in boolean not null default true,
  version text not null default '1.0.0',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, version)
);
create index integration_registries_category_idx on public.integration_registries (category, status);
grant select, insert, update, delete on public.integration_registries to authenticated;
grant all on public.integration_registries to service_role;
alter table public.integration_registries enable row level security;
create policy "integration_registries_read" on public.integration_registries for select to authenticated using (true);
create policy "integration_registries_write" on public.integration_registries for all to authenticated
  using (private.has_permission((select company_id from public.company_members where user_id = auth.uid() limit 1), 'integration.manage'))
  with check (private.has_permission((select company_id from public.company_members where user_id = auth.uid() limit 1), 'integration.manage'));

-- -------------------- COMPANY INTEGRATIONS -------------------
create table public.company_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid not null references public.integration_registries(id) on delete restrict,
  name text not null,
  status public.integration_status not null default 'draft',
  configuration jsonb not null default '{}'::jsonb,
  credentials_encrypted jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status public.sync_status,
  last_error text,
  is_enabled boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, integration_id, name)
);
create index company_integrations_company_idx on public.company_integrations (company_id, status);
grant select, insert, update, delete on public.company_integrations to authenticated;
grant all on public.company_integrations to service_role;
alter table public.company_integrations enable row level security;
create policy "company_integrations_read" on public.company_integrations for select to authenticated
  using (private.has_permission(company_id, 'integration.view') or private.is_company_member(company_id));
create policy "company_integrations_write" on public.company_integrations for all to authenticated
  using (private.has_permission(company_id, 'integration.manage'))
  with check (private.has_permission(company_id, 'integration.manage'));

-- ------------------------- API KEYS --------------------------
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  key_prefix text not null,
  key_hash text not null,
  status public.api_key_status not null default 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid,
  metadata jsonb not null default '{}'::jsonb
);
create index api_keys_company_idx on public.api_keys (company_id, status);
grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "api_keys_read" on public.api_keys for select to authenticated
  using (private.has_permission(company_id, 'api.view') or private.is_company_member(company_id));
create policy "api_keys_write" on public.api_keys for all to authenticated
  using (private.has_permission(company_id, 'api.manage'))
  with check (private.has_permission(company_id, 'api.manage'));

create table public.api_key_scopes (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now(),
  unique(api_key_id, scope)
);
create index api_key_scopes_key_idx on public.api_key_scopes (api_key_id);
grant select, insert, update, delete on public.api_key_scopes to authenticated;
grant all on public.api_key_scopes to service_role;
alter table public.api_key_scopes enable row level security;
create policy "api_key_scopes_read" on public.api_key_scopes for select to authenticated
  using (exists (select 1 from public.api_keys k where k.id = api_key_id and (private.has_permission(k.company_id, 'api.view') or private.is_company_member(k.company_id))));
create policy "api_key_scopes_write" on public.api_key_scopes for all to authenticated
  using (exists (select 1 from public.api_keys k where k.id = api_key_id and private.has_permission(k.company_id, 'api.manage')))
  with check (exists (select 1 from public.api_keys k where k.id = api_key_id and private.has_permission(k.company_id, 'api.manage')));

create table public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete cascade,
  scope text,
  limit_per_minute integer not null default 60,
  limit_per_hour integer not null default 1000,
  current_minute integer not null default 0,
  current_hour integer not null default 0,
  window_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index api_rate_limits_key_idx on public.api_rate_limits (api_key_id, window_started_at);
grant select, insert, update, delete on public.api_rate_limits to authenticated;
grant all on public.api_rate_limits to service_role;
alter table public.api_rate_limits enable row level security;
create policy "api_rate_limits_read" on public.api_rate_limits for select to authenticated
  using (exists (select 1 from public.api_keys k where k.id = api_key_id and (private.has_permission(k.company_id, 'api.view') or private.is_company_member(k.company_id))));
create policy "api_rate_limits_write" on public.api_rate_limits for all to authenticated
  using (exists (select 1 from public.api_keys k where k.id = api_key_id and private.has_permission(k.company_id, 'api.manage')))
  with check (exists (select 1 from public.api_keys k where k.id = api_key_id and private.has_permission(k.company_id, 'api.manage')));

-- ------------------------ WEBHOOKS ---------------------------
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  url text not null,
  secret text not null,
  secret_hash text not null,
  status public.webhook_status not null default 'active',
  events jsonb not null default '[]'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  retry_policy jsonb not null default '{"max_attempts":5,"backoff":"exponential"}'::jsonb,
  timeout_seconds integer not null default 30,
  is_enabled boolean not null default true,
  last_delivered_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index webhooks_company_idx on public.webhooks (company_id, status);
grant select, insert, update, delete on public.webhooks to authenticated;
grant all on public.webhooks to service_role;
alter table public.webhooks enable row level security;
create policy "webhooks_read" on public.webhooks for select to authenticated
  using (private.has_permission(company_id, 'webhook.view') or private.is_company_member(company_id));
create policy "webhooks_write" on public.webhooks for all to authenticated
  using (private.has_permission(company_id, 'webhook.manage'))
  with check (private.has_permission(company_id, 'webhook.manage'));

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  event_key text not null,
  status public.delivery_status not null default 'pending',
  request_headers jsonb not null default '{}'::jsonb,
  request_body jsonb not null default '{}'::jsonb,
  response_status integer,
  response_body text,
  response_headers jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_retry_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index webhook_deliveries_webhook_idx on public.webhook_deliveries (webhook_id, status, created_at desc);
create index webhook_deliveries_company_idx on public.webhook_deliveries (company_id, created_at desc);
grant select, insert, update, delete on public.webhook_deliveries to authenticated;
grant all on public.webhook_deliveries to service_role;
alter table public.webhook_deliveries enable row level security;
create policy "webhook_deliveries_read" on public.webhook_deliveries for select to authenticated
  using (exists (select 1 from public.webhooks w where w.id = webhook_id and (private.has_permission(w.company_id, 'webhook.view') or private.is_company_member(w.company_id))));
create policy "webhook_deliveries_write" on public.webhook_deliveries for all to authenticated
  using (exists (select 1 from public.webhooks w where w.id = webhook_id and private.has_permission(w.company_id, 'webhook.manage')))
  with check (exists (select 1 from public.webhooks w where w.id = webhook_id and private.has_permission(w.company_id, 'webhook.manage')));

-- ---------------------- INBOUND WEBHOOKS ---------------------
create table public.inbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.integration_registries(id) on delete set null,
  name text not null,
  path text not null,
  secret text not null,
  secret_hash text not null,
  provider text,
  event_types jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default true,
  headers jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, path)
);
create index inbound_webhooks_company_idx on public.inbound_webhooks (company_id, is_enabled);
grant select, insert, update, delete on public.inbound_webhooks to authenticated;
grant all on public.inbound_webhooks to service_role;
alter table public.inbound_webhooks enable row level security;
create policy "inbound_webhooks_read" on public.inbound_webhooks for select to authenticated
  using (private.has_permission(company_id, 'webhook.view') or private.is_company_member(company_id));
create policy "inbound_webhooks_write" on public.inbound_webhooks for all to authenticated
  using (private.has_permission(company_id, 'webhook.manage'))
  with check (private.has_permission(company_id, 'webhook.manage'));

-- ------------------------ OAUTH CONNECTIONS -----------------
create table public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid not null references public.integration_registries(id) on delete restrict,
  provider text not null,
  status public.oauth_status not null default 'disconnected',
  scopes jsonb not null default '[]'::jsonb,
  external_user_id text,
  external_user_email text,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_refreshed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, integration_id, provider)
);
create index oauth_connections_company_idx on public.oauth_connections (company_id, status);
grant select, insert, update, delete on public.oauth_connections to authenticated;
grant all on public.oauth_connections to service_role;
alter table public.oauth_connections enable row level security;
create policy "oauth_connections_read" on public.oauth_connections for select to authenticated
  using (private.has_permission(company_id, 'integration.view') or private.is_company_member(company_id));
create policy "oauth_connections_write" on public.oauth_connections for all to authenticated
  using (private.has_permission(company_id, 'integration.manage'))
  with check (private.has_permission(company_id, 'integration.manage'));

create table public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.oauth_connections(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  token_type text not null default 'Bearer',
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index oauth_tokens_connection_idx on public.oauth_tokens (connection_id);
grant select, insert, update, delete on public.oauth_tokens to authenticated;
grant all on public.oauth_tokens to service_role;
alter table public.oauth_tokens enable row level security;
create policy "oauth_tokens_read" on public.oauth_tokens for select to authenticated
  using (exists (select 1 from public.oauth_connections c where c.id = connection_id and (private.has_permission(c.company_id, 'integration.manage'))));
create policy "oauth_tokens_write" on public.oauth_tokens for all to authenticated
  using (exists (select 1 from public.oauth_connections c where c.id = connection_id and private.has_permission(c.company_id, 'integration.manage')))
  with check (exists (select 1 from public.oauth_connections c where c.id = connection_id and private.has_permission(c.company_id, 'integration.manage')));

-- ---------------------- INTEGRATION JOBS ---------------------
create table public.integration_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.integration_registries(id) on delete set null,
  company_integration_id uuid references public.company_integrations(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_jobs_company_idx on public.integration_jobs (company_id, status, created_at desc);
create index integration_jobs_integration_idx on public.integration_jobs (integration_id, created_at desc);
grant select, insert, update, delete on public.integration_jobs to authenticated;
grant all on public.integration_jobs to service_role;
alter table public.integration_jobs enable row level security;
create policy "integration_jobs_read" on public.integration_jobs for select to authenticated
  using (private.has_permission(company_id, 'integration.view') or private.is_company_member(company_id));
create policy "integration_jobs_write" on public.integration_jobs for all to authenticated
  using (private.has_permission(company_id, 'integration.manage'))
  with check (private.has_permission(company_id, 'integration.manage'));

-- ---------------------- SYNC ENGINE -------------------------
create table public.integration_syncs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid not null references public.integration_registries(id) on delete restrict,
  company_integration_id uuid references public.company_integrations(id) on delete cascade,
  sync_type text not null,
  direction public.sync_direction not null default 'pull',
  status public.sync_status not null default 'idle',
  started_at timestamptz,
  completed_at timestamptz,
  records_processed integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_failed integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_syncs_company_idx on public.integration_syncs (company_id, created_at desc);
create index integration_syncs_integration_idx on public.integration_syncs (integration_id, created_at desc);
grant select, insert, update, delete on public.integration_syncs to authenticated;
grant all on public.integration_syncs to service_role;
alter table public.integration_syncs enable row level security;
create policy "integration_syncs_read" on public.integration_syncs for select to authenticated
  using (private.has_permission(company_id, 'integration.view') or private.is_company_member(company_id));
create policy "integration_syncs_write" on public.integration_syncs for all to authenticated
  using (private.has_permission(company_id, 'integration.manage'))
  with check (private.has_permission(company_id, 'integration.manage'));

-- --------------------- DATA IMPORTS -------------------------
create table public.data_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  entity_type text not null,
  format public.import_format not null default 'csv',
  status public.import_status not null default 'pending',
  total_rows integer,
  processed_rows integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  file_url text,
  file_name text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index data_imports_company_idx on public.data_imports (company_id, status, created_at desc);
grant select, insert, update, delete on public.data_imports to authenticated;
grant all on public.data_imports to service_role;
alter table public.data_imports enable row level security;
create policy "data_imports_read" on public.data_imports for select to authenticated
  using (private.has_permission(company_id, 'data.import') or private.is_company_member(company_id));
create policy "data_imports_write" on public.data_imports for all to authenticated
  using (private.has_permission(company_id, 'data.import'))
  with check (private.has_permission(company_id, 'data.import'));

-- --------------------- DATA EXPORTS -------------------------
create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  entity_type text not null,
  format public.export_format not null default 'csv',
  status public.import_status not null default 'pending',
  total_rows integer,
  filters jsonb not null default '{}'::jsonb,
  file_url text,
  file_name text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index data_exports_company_idx on public.data_exports (company_id, status, created_at desc);
grant select, insert, update, delete on public.data_exports to authenticated;
grant all on public.data_exports to service_role;
alter table public.data_exports enable row level security;
create policy "data_exports_read" on public.data_exports for select to authenticated
  using (private.has_permission(company_id, 'data.export') or private.is_company_member(company_id));
create policy "data_exports_write" on public.data_exports for all to authenticated
  using (private.has_permission(company_id, 'data.export'))
  with check (private.has_permission(company_id, 'data.export'));

-- ------------------- DEVELOPER APPLICATIONS ----------------
create table public.developer_apps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  description text,
  redirect_uris jsonb not null default '[]'::jsonb,
  scopes jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index developer_apps_user_idx on public.developer_apps (user_id, is_active);
grant select, insert, update, delete on public.developer_apps to authenticated;
grant all on public.developer_apps to service_role;
alter table public.developer_apps enable row level security;
create policy "developer_apps_read" on public.developer_apps for select to authenticated
  using (user_id = auth.uid() or private.has_permission(company_id, 'developer.manage'));
create policy "developer_apps_write" on public.developer_apps for all to authenticated
  using (user_id = auth.uid() or private.has_permission(company_id, 'developer.manage'))
  with check (user_id = auth.uid() or private.has_permission(company_id, 'developer.manage'));

create table public.developer_app_keys (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.developer_apps(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null,
  secret_hash text not null,
  status public.api_key_status not null default 'active',
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz not null default now()
);
create index developer_app_keys_app_idx on public.developer_app_keys (app_id, status);
grant select, insert, update, delete on public.developer_app_keys to authenticated;
grant all on public.developer_app_keys to service_role;
alter table public.developer_app_keys enable row level security;
create policy "developer_app_keys_read" on public.developer_app_keys for select to authenticated
  using (exists (select 1 from public.developer_apps a where a.id = app_id and (a.user_id = auth.uid() or private.has_permission(a.company_id, 'developer.manage'))));
create policy "developer_app_keys_write" on public.developer_app_keys for all to authenticated
  using (exists (select 1 from public.developer_apps a where a.id = app_id and (a.user_id = auth.uid() or private.has_permission(a.company_id, 'developer.manage'))))
  with check (exists (select 1 from public.developer_apps a where a.id = app_id and (a.user_id = auth.uid() or private.has_permission(a.company_id, 'developer.manage'))));

-- --------------------- INTEGRATION LOGS ----------------------
create table public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  integration_id uuid references public.integration_registries(id) on delete set null,
  company_integration_id uuid references public.company_integrations(id) on delete cascade,
  level text not null default 'info',
  category text not null,
  action text not null,
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index integration_logs_company_idx on public.integration_logs (company_id, created_at desc);
create index integration_logs_category_idx on public.integration_logs (category, created_at desc);
grant select, insert, update, delete on public.integration_logs to authenticated;
grant all on public.integration_logs to service_role;
alter table public.integration_logs enable row level security;
create policy "integration_logs_read" on public.integration_logs for select to authenticated
  using (private.has_permission(company_id, 'integration.view') or private.is_company_member(company_id));
create policy "integration_logs_write" on public.integration_logs for all to authenticated
  using (private.has_permission(company_id, 'integration.manage'))
  with check (private.has_permission(company_id, 'integration.manage'));

-- --------------------- TIMESTAMP TRIGGERS -------------------
create trigger tr_integration_registries_updated before update on public.integration_registries for each row execute function public.set_updated_at();
create trigger tr_company_integrations_updated before update on public.company_integrations for each row execute function public.set_updated_at();
create trigger tr_api_keys_updated before update on public.api_keys for each row execute function public.set_updated_at();
create trigger tr_api_rate_limits_updated before update on public.api_rate_limits for each row execute function public.set_updated_at();
create trigger tr_webhooks_updated before update on public.webhooks for each row execute function public.set_updated_at();
create trigger tr_webhook_deliveries_updated before update on public.webhook_deliveries for each row execute function public.set_updated_at();
create trigger tr_inbound_webhooks_updated before update on public.inbound_webhooks for each row execute function public.set_updated_at();
create trigger tr_oauth_connections_updated before update on public.oauth_connections for each row execute function public.set_updated_at();
create trigger tr_oauth_tokens_updated before update on public.oauth_tokens for each row execute function public.set_updated_at();
create trigger tr_integration_jobs_updated before update on public.integration_jobs for each row execute function public.set_updated_at();
create trigger tr_integration_syncs_updated before update on public.integration_syncs for each row execute function public.set_updated_at();
create trigger tr_data_imports_updated before update on public.data_imports for each row execute function public.set_updated_at();
create trigger tr_data_exports_updated before update on public.data_exports for each row execute function public.set_updated_at();
create trigger tr_developer_apps_updated before update on public.developer_apps for each row execute function public.set_updated_at();
create trigger tr_integration_logs_updated before update on public.integration_logs for each row execute function public.set_updated_at();

create trigger tr_audit_integration_registries after insert or update or delete on public.integration_registries for each row execute function public.audit_m2_change();
create trigger tr_audit_company_integrations after insert or update or delete on public.company_integrations for each row execute function public.audit_m2_change();
create trigger tr_audit_api_keys after insert or update or delete on public.api_keys for each row execute function public.audit_m2_change();
create trigger tr_audit_webhooks after insert or update or delete on public.webhooks for each row execute function public.audit_m2_change();
create trigger tr_audit_oauth_connections after insert or update or delete on public.oauth_connections for each row execute function public.audit_m2_change();
create trigger tr_audit_integration_jobs after insert or update or delete on public.integration_jobs for each row execute function public.audit_m2_change();
create trigger tr_audit_data_imports after insert or update or delete on public.data_imports for each row execute function public.audit_m2_change();
create trigger tr_audit_data_exports after insert or update or delete on public.data_exports for each row execute function public.audit_m2_change();
create trigger tr_audit_developer_apps after insert or update or delete on public.developer_apps for each row execute function public.audit_m2_change();
create trigger tr_audit_integration_logs after insert or update or delete on public.integration_logs for each row execute function public.audit_m2_change();

-- --------------------------- PERMISSIONS ----------------------
insert into public.permissions (key, module, description) values
  ('integration.view',   'integrations', 'View integrations and sync status'),
  ('integration.manage', 'integrations', 'Connect, configure and manage integrations'),
  ('api.view',           'integrations', 'View API keys and usage'),
  ('api.manage',         'integrations', 'Create and manage API keys'),
  ('webhook.view',       'integrations', 'View webhooks and delivery logs'),
  ('webhook.manage',     'integrations', 'Create and manage webhooks'),
  ('developer.manage',   'integrations', 'Manage developer apps and credentials'),
  ('data.import',        'integrations', 'Import data into Gevon'),
  ('data.export',        'integrations', 'Export data from Gevon')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, v.perm
from public.roles r
join (values
  ('owner','integration.view'),('owner','integration.manage'),('owner','api.view'),('owner','api.manage'),('owner','webhook.view'),('owner','webhook.manage'),
  ('owner','developer.manage'),('owner','data.import'),('owner','data.export'),
  ('admin','integration.view'),('admin','integration.manage'),('admin','api.view'),('admin','api.manage'),('admin','webhook.view'),('admin','webhook.manage'),
  ('admin','data.import'),('admin','data.export'),
  ('manager','integration.view'),('manager','integration.manage'),('manager','api.view'),('manager','webhook.view'),
  ('manager','data.import'),('manager','data.export'),
  ('staff','integration.view'),('staff','data.import'),('staff','data.export'),
  ('viewer','integration.view')
) as v(role_key, perm) on v.role_key = r.key
on conflict do nothing;

-- ------------------------ FEATURE FLAGS ----------------------
insert into public.feature_flags (key, module_id, name, description, default_status) values
  ('api_platform',        'integrations', 'API Platform',        'External API access with keys and scopes', 'beta'),
  ('webhooks',            'integrations', 'Webhooks',            'Outbound and inbound webhook subscriptions', 'beta'),
  ('developer_portal',    'integrations', 'Developer Portal',    'Developer applications and API docs', 'beta'),
  ('pos_integrations',    'integrations', 'POS Integrations',    'External POS system adapters', 'beta'),
  ('payment_integrations','integrations', 'Payment Integrations','External payment provider adapters', 'beta'),
  ('data_import_export',  'integrations', 'Data Import / Export', 'CSV, Excel and JSON data flows', 'beta'),
  ('oauth_connections',   'integrations', 'OAuth Connections',   'OAuth-based integration connections', 'beta')
on conflict (key) do nothing;
