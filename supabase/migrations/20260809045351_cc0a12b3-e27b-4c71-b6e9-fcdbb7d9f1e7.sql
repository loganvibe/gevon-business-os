-- ============================================================
-- MILESTONE 11 — CUSTOMER GROWTH & MARKETING ENGINE
-- ============================================================

-- ---------------------------- ENUMS -------------------------
do $$ begin create type public.customer_type as enum ('individual','business','wholesale','vip','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.customer_status as enum ('active','inactive','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.segment_kind as enum ('dynamic','static'); exception when duplicate_object then null; end $$;
do $$ begin create type public.consent_status as enum ('unknown','opted_in','opted_out'); exception when duplicate_object then null; end $$;
do $$ begin create type public.loyalty_txn_type as enum ('earn','redeem','adjust','expire','revoke'); exception when duplicate_object then null; end $$;
do $$ begin create type public.promotion_type as enum ('percentage','fixed','buy_x_get_y'); exception when duplicate_object then null; end $$;
do $$ begin create type public.promotion_status as enum ('draft','active','paused','expired','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.promotion_scope as enum ('all','product','category','segment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.coupon_status as enum ('active','disabled','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gift_card_status as enum ('draft','active','redeemed','expired','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gift_card_txn_type as enum ('issue','redeem','adjust','expire','refund'); exception when duplicate_object then null; end $$;
do $$ begin create type public.campaign_status as enum ('draft','scheduled','running','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.campaign_message_status as enum ('pending','queued','sent','delivered','failed','skipped','suppressed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.campaign_event_type as enum ('sent','delivered','opened','clicked','bounced','failed','unsubscribed','converted'); exception when duplicate_object then null; end $$;

-- --------------------------- CUSTOMERS ----------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  phone text,
  email text,
  customer_type public.customer_type not null default 'individual',
  status public.customer_status not null default 'active',
  city text,
  state text,
  country_code text,
  address text,
  notes text,
  tags text[] not null default '{}',
  attributes jsonb not null default '{}'::jsonb,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  total_spent numeric(14,2) not null default 0,
  purchase_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index customers_company_idx on public.customers (company_id, status, created_at desc);
create index customers_last_purchase_idx on public.customers (company_id, last_purchase_at desc nulls last);
create unique index customers_company_phone_uniq on public.customers (company_id, phone) where phone is not null and deleted_at is null;
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers_read" on public.customers for select to authenticated
  using (private.has_permission(company_id, 'customer.view'));
create policy "customers_write" on public.customers for all to authenticated
  using (private.has_permission(company_id, 'customer.manage'))
  with check (private.has_permission(company_id, 'customer.manage'));

-- ----------------------- CUSTOMER CONSENTS ------------------
create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel public.communication_channel not null,
  status public.consent_status not null default 'unknown',
  source text,
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, channel)
);
create index customer_consents_company_idx on public.customer_consents (company_id, channel, status);
grant select, insert, update, delete on public.customer_consents to authenticated;
grant all on public.customer_consents to service_role;
alter table public.customer_consents enable row level security;
create policy "customer_consents_read" on public.customer_consents for select to authenticated
  using (private.has_permission(company_id, 'customer.view'));
create policy "customer_consents_write" on public.customer_consents for all to authenticated
  using (private.has_permission(company_id, 'customer_communication.manage'))
  with check (private.has_permission(company_id, 'customer_communication.manage'));

-- ----------------------- CUSTOMER SEGMENTS ------------------
create table public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  kind public.segment_kind not null default 'dynamic',
  /* Declarative, validated filter set (no arbitrary SQL). */
  rules jsonb not null default '{"logic":"all","conditions":[]}'::jsonb,
  is_system boolean not null default false,
  is_active boolean not null default true,
  member_count integer not null default 0,
  last_evaluated_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_segments_company_idx on public.customer_segments (company_id, is_active);
create unique index customer_segments_name_uniq on public.customer_segments (company_id, lower(name));
grant select, insert, update, delete on public.customer_segments to authenticated;
grant all on public.customer_segments to service_role;
alter table public.customer_segments enable row level security;
create policy "customer_segments_read" on public.customer_segments for select to authenticated
  using (private.has_permission(company_id, 'segments.view'));
create policy "customer_segments_write" on public.customer_segments for all to authenticated
  using (private.has_permission(company_id, 'segments.manage'))
  with check (private.has_permission(company_id, 'segments.manage'));

create table public.customer_segment_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  segment_id uuid not null references public.customer_segments(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  added_by text not null default 'evaluation',
  entered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, customer_id)
);
create index customer_segment_members_company_idx on public.customer_segment_members (company_id, segment_id);
grant select, insert, update, delete on public.customer_segment_members to authenticated;
grant all on public.customer_segment_members to service_role;
alter table public.customer_segment_members enable row level security;
create policy "customer_segment_members_read" on public.customer_segment_members for select to authenticated
  using (private.has_permission(company_id, 'segments.view'));
create policy "customer_segment_members_write" on public.customer_segment_members for all to authenticated
  using (private.has_permission(company_id, 'segments.manage'))
  with check (private.has_permission(company_id, 'segments.manage'));

-- ---------------------------- LOYALTY -----------------------
create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  /* configurable earn model */
  points_per_amount numeric(12,4) not null default 1,
  amount_unit numeric(12,2) not null default 1000,
  point_value numeric(12,4) not null default 1,
  min_redemption_points integer not null default 100,
  points_expire_after_days integer,
  /* [{ "name": "Silver", "min_points": 1000 }, ... ] */
  tiers jsonb not null default '[]'::jsonb,
  currency_code text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loyalty_programs_company_idx on public.loyalty_programs (company_id, is_active);
grant select, insert, update, delete on public.loyalty_programs to authenticated;
grant all on public.loyalty_programs to service_role;
alter table public.loyalty_programs enable row level security;
create policy "loyalty_programs_read" on public.loyalty_programs for select to authenticated
  using (private.has_permission(company_id, 'loyalty.view'));
create policy "loyalty_programs_write" on public.loyalty_programs for all to authenticated
  using (private.has_permission(company_id, 'loyalty.manage'))
  with check (private.has_permission(company_id, 'loyalty.manage'));

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_balance integer not null default 0,
  lifetime_points integer not null default 0,
  redeemed_points integer not null default 0,
  tier text,
  enrolled_at timestamptz not null default now(),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, customer_id)
);
create index loyalty_accounts_company_idx on public.loyalty_accounts (company_id, points_balance desc);
grant select, insert, update, delete on public.loyalty_accounts to authenticated;
grant all on public.loyalty_accounts to service_role;
alter table public.loyalty_accounts enable row level security;
create policy "loyalty_accounts_read" on public.loyalty_accounts for select to authenticated
  using (private.has_permission(company_id, 'loyalty.view'));
create policy "loyalty_accounts_write" on public.loyalty_accounts for all to authenticated
  using (private.has_permission(company_id, 'loyalty.manage'))
  with check (private.has_permission(company_id, 'loyalty.manage'));

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  txn_type public.loyalty_txn_type not null,
  points integer not null,
  balance_after integer not null default 0,
  reason text,
  sale_id uuid references public.sales(id) on delete set null,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loyalty_transactions_account_idx on public.loyalty_transactions (account_id, created_at desc);
create index loyalty_transactions_company_idx on public.loyalty_transactions (company_id, created_at desc);
grant select, insert, update, delete on public.loyalty_transactions to authenticated;
grant all on public.loyalty_transactions to service_role;
alter table public.loyalty_transactions enable row level security;
create policy "loyalty_transactions_read" on public.loyalty_transactions for select to authenticated
  using (private.has_permission(company_id, 'loyalty.view'));
create policy "loyalty_transactions_write" on public.loyalty_transactions for all to authenticated
  using (private.has_permission(company_id, 'loyalty.manage'))
  with check (private.has_permission(company_id, 'loyalty.manage'));

-- --------------------------- PROMOTIONS ---------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  promo_type public.promotion_type not null default 'percentage',
  status public.promotion_status not null default 'draft',
  value numeric(12,2) not null default 0,
  scope public.promotion_scope not null default 'all',
  min_purchase_amount numeric(14,2) not null default 0,
  max_discount_amount numeric(14,2),
  segment_id uuid references public.customer_segments(id) on delete set null,
  buy_quantity integer,
  get_quantity integer,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_limit_per_customer integer,
  usage_count integer not null default 0,
  currency_code text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index promotions_company_idx on public.promotions (company_id, status, starts_at desc);
grant select, insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
alter table public.promotions enable row level security;
create policy "promotions_read" on public.promotions for select to authenticated
  using (private.has_permission(company_id, 'promotions.view'));
create policy "promotions_write" on public.promotions for all to authenticated
  using (private.has_permission(company_id, 'promotions.manage'))
  with check (private.has_permission(company_id, 'promotions.manage'));

create table public.promotion_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete cascade,
  min_quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index promotion_rules_promotion_idx on public.promotion_rules (promotion_id);
grant select, insert, update, delete on public.promotion_rules to authenticated;
grant all on public.promotion_rules to service_role;
alter table public.promotion_rules enable row level security;
create policy "promotion_rules_read" on public.promotion_rules for select to authenticated
  using (private.has_permission(company_id, 'promotions.view'));
create policy "promotion_rules_write" on public.promotion_rules for all to authenticated
  using (private.has_permission(company_id, 'promotions.manage'))
  with check (private.has_permission(company_id, 'promotions.manage'));

-- ---------------------------- COUPONS -----------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  code text not null,
  description text,
  promotion_id uuid references public.promotions(id) on delete set null,
  discount_type public.discount_type not null default 'percentage',
  discount_value numeric(12,2) not null default 0,
  min_purchase_amount numeric(14,2) not null default 0,
  max_discount_amount numeric(14,2),
  status public.coupon_status not null default 'active',
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer,
  usage_limit_per_customer integer not null default 1,
  usage_count integer not null default 0,
  customer_id uuid references public.customers(id) on delete set null,
  segment_id uuid references public.customer_segments(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  category_id uuid references public.product_categories(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index coupons_company_code_uniq on public.coupons (company_id, upper(code));
create index coupons_company_idx on public.coupons (company_id, status, expires_at);
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "coupons_read" on public.coupons for select to authenticated
  using (private.has_permission(company_id, 'promotions.view'));
create policy "coupons_write" on public.coupons for all to authenticated
  using (private.has_permission(company_id, 'coupons.manage'))
  with check (private.has_permission(company_id, 'coupons.manage'));

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  amount_discounted numeric(14,2) not null default 0,
  redeemed_by uuid,
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id, redeemed_at desc);
create unique index coupon_redemptions_sale_uniq on public.coupon_redemptions (coupon_id, sale_id) where sale_id is not null;
grant select, insert, update, delete on public.coupon_redemptions to authenticated;
grant all on public.coupon_redemptions to service_role;
alter table public.coupon_redemptions enable row level security;
create policy "coupon_redemptions_read" on public.coupon_redemptions for select to authenticated
  using (private.has_permission(company_id, 'promotions.view'));
create policy "coupon_redemptions_write" on public.coupon_redemptions for all to authenticated
  using (private.has_permission(company_id, 'coupons.manage'))
  with check (private.has_permission(company_id, 'coupons.manage'));

-- -------------------------- GIFT CARDS ----------------------
create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  code text not null,
  status public.gift_card_status not null default 'draft',
  initial_value numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  currency_code text,
  customer_id uuid references public.customers(id) on delete set null,
  recipient_name text,
  recipient_email text,
  note text,
  activated_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index gift_cards_company_code_uniq on public.gift_cards (company_id, upper(code));
create index gift_cards_company_idx on public.gift_cards (company_id, status, expires_at);
grant select, insert, update, delete on public.gift_cards to authenticated;
grant all on public.gift_cards to service_role;
alter table public.gift_cards enable row level security;
create policy "gift_cards_read" on public.gift_cards for select to authenticated
  using (private.has_permission(company_id, 'marketing.view'));
create policy "gift_cards_write" on public.gift_cards for all to authenticated
  using (private.has_permission(company_id, 'giftcards.manage'))
  with check (private.has_permission(company_id, 'giftcards.manage'));

create table public.gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  gift_card_id uuid not null references public.gift_cards(id) on delete cascade,
  txn_type public.gift_card_txn_type not null,
  amount numeric(14,2) not null default 0,
  balance_after numeric(14,2) not null default 0,
  sale_id uuid references public.sales(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gift_card_transactions_card_idx on public.gift_card_transactions (gift_card_id, created_at desc);
grant select, insert, update, delete on public.gift_card_transactions to authenticated;
grant all on public.gift_card_transactions to service_role;
alter table public.gift_card_transactions enable row level security;
create policy "gift_card_transactions_read" on public.gift_card_transactions for select to authenticated
  using (private.has_permission(company_id, 'marketing.view'));
create policy "gift_card_transactions_write" on public.gift_card_transactions for all to authenticated
  using (private.has_permission(company_id, 'giftcards.manage'))
  with check (private.has_permission(company_id, 'giftcards.manage'));

-- ------------------------- CAMPAIGNS ------------------------
create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  status public.campaign_status not null default 'draft',
  channel public.communication_channel not null default 'email',
  segment_id uuid references public.customer_segments(id) on delete set null,
  promotion_id uuid references public.promotions(id) on delete set null,
  coupon_id uuid references public.coupons(id) on delete set null,
  template_key text,
  subject text,
  body text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  targeted_count integer not null default 0,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  opened_count integer not null default 0,
  clicked_count integer not null default 0,
  converted_count integer not null default 0,
  revenue_attributed numeric(14,2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketing_campaigns_company_idx on public.marketing_campaigns (company_id, status, scheduled_at desc);
create index marketing_campaigns_due_idx on public.marketing_campaigns (status, scheduled_at);
grant select, insert, update, delete on public.marketing_campaigns to authenticated;
grant all on public.marketing_campaigns to service_role;
alter table public.marketing_campaigns enable row level security;
create policy "marketing_campaigns_read" on public.marketing_campaigns for select to authenticated
  using (private.has_permission(company_id, 'campaigns.view'));
create policy "marketing_campaigns_write" on public.marketing_campaigns for all to authenticated
  using (private.has_permission(company_id, 'campaigns.manage'))
  with check (private.has_permission(company_id, 'campaigns.manage'));

create table public.campaign_audiences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  segment_id uuid references public.customer_segments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaign_audiences_campaign_idx on public.campaign_audiences (campaign_id);
create unique index campaign_audiences_customer_uniq on public.campaign_audiences (campaign_id, customer_id) where customer_id is not null;
grant select, insert, update, delete on public.campaign_audiences to authenticated;
grant all on public.campaign_audiences to service_role;
alter table public.campaign_audiences enable row level security;
create policy "campaign_audiences_read" on public.campaign_audiences for select to authenticated
  using (private.has_permission(company_id, 'campaigns.view'));
create policy "campaign_audiences_write" on public.campaign_audiences for all to authenticated
  using (private.has_permission(company_id, 'campaigns.manage'))
  with check (private.has_permission(company_id, 'campaigns.manage'));

create table public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel public.communication_channel not null,
  status public.campaign_message_status not null default 'pending',
  recipient text,
  subject text,
  body text,
  provider text,
  provider_message_id text,
  error text,
  communication_log_id uuid references public.communication_logs(id) on delete set null,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaign_messages_campaign_idx on public.campaign_messages (campaign_id, status);
create unique index campaign_messages_unique_recipient on public.campaign_messages (campaign_id, customer_id) where customer_id is not null;
grant select, insert, update, delete on public.campaign_messages to authenticated;
grant all on public.campaign_messages to service_role;
alter table public.campaign_messages enable row level security;
create policy "campaign_messages_read" on public.campaign_messages for select to authenticated
  using (private.has_permission(company_id, 'campaigns.view'));
create policy "campaign_messages_write" on public.campaign_messages for all to authenticated
  using (private.has_permission(company_id, 'campaigns.manage'))
  with check (private.has_permission(company_id, 'campaigns.manage'));

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  message_id uuid references public.campaign_messages(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  event_type public.campaign_event_type not null,
  sale_id uuid references public.sales(id) on delete set null,
  revenue numeric(14,2),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaign_events_campaign_idx on public.campaign_events (campaign_id, event_type, occurred_at desc);
grant select, insert, update, delete on public.campaign_events to authenticated;
grant all on public.campaign_events to service_role;
alter table public.campaign_events enable row level security;
create policy "campaign_events_read" on public.campaign_events for select to authenticated
  using (private.has_permission(company_id, 'campaigns.view'));
create policy "campaign_events_write" on public.campaign_events for all to authenticated
  using (private.has_permission(company_id, 'campaigns.manage'))
  with check (private.has_permission(company_id, 'campaigns.manage'));

-- --------------------------- TRIGGERS -----------------------
create trigger set_updated_at_customers before update on public.customers for each row execute function public.set_updated_at();
create trigger set_updated_at_customer_consents before update on public.customer_consents for each row execute function public.set_updated_at();
create trigger set_updated_at_customer_segments before update on public.customer_segments for each row execute function public.set_updated_at();
create trigger set_updated_at_customer_segment_members before update on public.customer_segment_members for each row execute function public.set_updated_at();
create trigger set_updated_at_loyalty_programs before update on public.loyalty_programs for each row execute function public.set_updated_at();
create trigger set_updated_at_loyalty_accounts before update on public.loyalty_accounts for each row execute function public.set_updated_at();
create trigger set_updated_at_loyalty_transactions before update on public.loyalty_transactions for each row execute function public.set_updated_at();
create trigger set_updated_at_promotions before update on public.promotions for each row execute function public.set_updated_at();
create trigger set_updated_at_promotion_rules before update on public.promotion_rules for each row execute function public.set_updated_at();
create trigger set_updated_at_coupons before update on public.coupons for each row execute function public.set_updated_at();
create trigger set_updated_at_coupon_redemptions before update on public.coupon_redemptions for each row execute function public.set_updated_at();
create trigger set_updated_at_gift_cards before update on public.gift_cards for each row execute function public.set_updated_at();
create trigger set_updated_at_gift_card_transactions before update on public.gift_card_transactions for each row execute function public.set_updated_at();
create trigger set_updated_at_marketing_campaigns before update on public.marketing_campaigns for each row execute function public.set_updated_at();
create trigger set_updated_at_campaign_audiences before update on public.campaign_audiences for each row execute function public.set_updated_at();
create trigger set_updated_at_campaign_messages before update on public.campaign_messages for each row execute function public.set_updated_at();
create trigger set_updated_at_campaign_events before update on public.campaign_events for each row execute function public.set_updated_at();

-- Keep customer purchase rollups authoritative when a sale completes.
create or replace function public.sync_customer_purchase_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then return new; end if;
  if new.status = 'completed' and (tg_op = 'INSERT' or coalesce(old.status::text,'') <> 'completed') then
    update public.customers c
       set total_spent    = c.total_spent + coalesce(new.total, 0),
           purchase_count = c.purchase_count + 1,
           first_purchase_at = coalesce(c.first_purchase_at, coalesce(new.completed_at, now())),
           last_purchase_at  = greatest(coalesce(c.last_purchase_at, to_timestamp(0)), coalesce(new.completed_at, now())),
           updated_at     = now()
     where c.id = new.customer_id and c.company_id = new.company_id;
  end if;
  return new;
end;
$$;

create trigger sync_customer_purchase_rollup_trg
after insert or update of status on public.sales
for each row execute function public.sync_customer_purchase_rollup();

-- Audit logging (reuses the platform audit trigger).
create trigger audit_customers after insert or update or delete on public.customers for each row execute function public.audit_m2_change();
create trigger audit_customer_segments after insert or update or delete on public.customer_segments for each row execute function public.audit_m2_change();
create trigger audit_loyalty_programs after insert or update or delete on public.loyalty_programs for each row execute function public.audit_m2_change();
create trigger audit_loyalty_transactions after insert or update or delete on public.loyalty_transactions for each row execute function public.audit_m2_change();
create trigger audit_promotions after insert or update or delete on public.promotions for each row execute function public.audit_m2_change();
create trigger audit_coupons after insert or update or delete on public.coupons for each row execute function public.audit_m2_change();
create trigger audit_coupon_redemptions after insert or update or delete on public.coupon_redemptions for each row execute function public.audit_m2_change();
create trigger audit_gift_cards after insert or update or delete on public.gift_cards for each row execute function public.audit_m2_change();
create trigger audit_gift_card_transactions after insert or update or delete on public.gift_card_transactions for each row execute function public.audit_m2_change();
create trigger audit_marketing_campaigns after insert or update or delete on public.marketing_campaigns for each row execute function public.audit_m2_change();

-- ------------------------- PERMISSIONS ----------------------
insert into public.permissions (key, module, description) values
  ('customer.view',                 'marketing', 'View customers'),
  ('customer.manage',               'marketing', 'Create and edit customers'),
  ('marketing.view',                'marketing', 'View the customer growth workspace'),
  ('marketing.manage',              'marketing', 'Manage marketing configuration'),
  ('segments.view',                 'marketing', 'View customer segments'),
  ('segments.manage',               'marketing', 'Create and manage customer segments'),
  ('loyalty.view',                  'marketing', 'View loyalty programs and balances'),
  ('loyalty.manage',                'marketing', 'Manage loyalty programs, award and redeem points'),
  ('promotions.view',               'marketing', 'View promotions and coupons'),
  ('promotions.manage',             'marketing', 'Create and manage promotions'),
  ('coupons.manage',                'marketing', 'Create, disable and redeem coupons'),
  ('giftcards.manage',              'marketing', 'Issue and redeem gift cards'),
  ('campaigns.view',                'marketing', 'View marketing campaigns and analytics'),
  ('campaigns.manage',              'marketing', 'Create, schedule and cancel campaigns'),
  ('customer_communication.manage', 'marketing', 'Manage customer consent and communication preferences')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values
  ('owner','customer.view'),('owner','customer.manage'),
  ('owner','marketing.view'),('owner','marketing.manage'),
  ('owner','segments.view'),('owner','segments.manage'),
  ('owner','loyalty.view'),('owner','loyalty.manage'),
  ('owner','promotions.view'),('owner','promotions.manage'),
  ('owner','coupons.manage'),('owner','giftcards.manage'),
  ('owner','campaigns.view'),('owner','campaigns.manage'),
  ('owner','customer_communication.manage'),
  ('admin','customer.view'),('admin','customer.manage'),
  ('admin','marketing.view'),('admin','marketing.manage'),
  ('admin','segments.view'),('admin','segments.manage'),
  ('admin','loyalty.view'),('admin','loyalty.manage'),
  ('admin','promotions.view'),('admin','promotions.manage'),
  ('admin','coupons.manage'),('admin','giftcards.manage'),
  ('admin','campaigns.view'),('admin','campaigns.manage'),
  ('admin','customer_communication.manage'),
  ('manager','customer.view'),('manager','customer.manage'),
  ('manager','marketing.view'),
  ('manager','segments.view'),
  ('manager','loyalty.view'),('manager','loyalty.manage'),
  ('manager','promotions.view'),('manager','promotions.manage'),
  ('manager','coupons.manage'),
  ('manager','campaigns.view'),
  ('staff','customer.view'),
  ('staff','loyalty.view'),
  ('staff','promotions.view')
) as p(role_key, key)
where r.key = p.role_key
on conflict do nothing;