# Milestone 6 — Sales & Order Management Foundation

Universal Sales Engine plugging into the Gevon module system. Reuses M1–M5 (auth, tenancy, RBAC, RLS, audit, module registry, event bus, notifications, inventory). Not a POS — a native sales engine that can also ingest events from external POS systems (integrated mode).

Core rule: do not modify Core / CRM / Inventory except for additive wiring (registry + events registry imports).

## 1. Scope

**In scope**
- `sales` module manifest (`category: sales`, tier `starter`, depends on `core`, soft-depends on `inventory` + `crm`), registered in `src/platform/registry.ts`.
- Entities: `sales`, `sale_items`, `orders`, `order_items`, `returns`, `return_items`, `discounts`, `payment_records`.
- Multi-branch, multi-currency (company currency by default), multi-tenant via RLS.
- Sale lifecycle: draft → completed / cancelled. Order lifecycle: draft → pending → confirmed → completed / cancelled. Return lifecycle: draft → approved → completed.
- Automatic inventory decrement on `sale.completed` via `record_sale_atomic()` RPC (uses `stock_movements` type=`sale`); return re-increments via type=`return`.
- Payment records support cash, transfer, card, split, other; status pending → paid / partial / refunded / failed. Prepared for future online providers.
- Events published through existing bus: `sale.created`, `sale.completed`, `sale.cancelled`, `sale.returned`, `order.created`, `order.completed`, `payment.received`.
- Permissions: `sales.view/create/complete/cancel`, `order.view/manage`, `return.view/manage`, `payment.view/record`, `discount.manage`.
- Feature flag `sales.enabled` default `beta`. Module gated by flag + `company_modules.enabled`.
- Integrated Mode: public server route `POST /api/public/hooks/sales-ingest` that accepts signed external POS events and enqueues them onto the platform event bus (behind HMAC secret).
- AI capability registration only (no LLM calls): `sales_forecast`, `customer_purchase_patterns`, `product_recommendations`, `sales_trend_analysis`.
- UI: `/app/sales`, `/app/orders`, `/app/returns`, `/app/payments`, plus dashboard widgets (Today's Sales, Orders Waiting, Payments Received, Returns, Top Products, Average Sale).

**Out of scope**
- Real online payment provider integration (Paystack/Flutterwave/Stripe).
- Tax engine (schema-ready `tax_amount` + `tax_rate` fields; no calculation logic).
- Kitchen/table management (restaurant-specific) — future module.
- Loyalty / gift cards.
- Actual AI models.
- Receipt printing / hardware.

## 2. Architecture

```text
src/modules/sales/
  index.ts                          # manifest + registerModule
  events.ts                         # sales event definitions
  widgets/
    TodaysSales.tsx  OrdersWaiting.tsx  PaymentsReceived.tsx
    ReturnsToday.tsx  TopSellingProducts.tsx  AverageSaleValue.tsx
    _registry.ts
  server/
    sales.functions.ts              # createDraftSale / completeSale / cancelSale / listSales / getSale
    orders.functions.ts              # createOrder / updateOrderStatus / listOrders / getOrder
    returns.functions.ts              # createReturn / approveReturn / listReturns
    payments.functions.ts             # recordPayment / listPayments
    discounts.functions.ts            # crud
    summary.functions.ts              # salesSummary for dashboard
  components/
    SalesTable.tsx  NewSaleDialog.tsx  SaleDetailDrawer.tsx
    OrdersTable.tsx  OrderStatusBadge.tsx
    ReturnsTable.tsx  NewReturnDialog.tsx
    PaymentsTable.tsx  RecordPaymentDialog.tsx
    ProductPicker.tsx  DiscountPicker.tsx

src/platform/events/definitions/sales.ts

src/routes/_authenticated/
  app.sales.tsx                     # layout Overview | Sales | Orders | Returns | Payments
  app.sales.index.tsx
  app.orders.tsx
  app.returns.tsx
  app.payments.tsx

src/routes/api/public/hooks/sales-ingest.ts   # external POS ingestion (HMAC-verified)

docs/architecture-m6.md
docs/sales/{entities,events,permissions,integrated-mode}.md
```

## 3. Database

Enums:
- `sale_status` (draft, completed, cancelled)
- `order_status` (draft, pending, confirmed, completed, cancelled)
- `return_status` (draft, approved, completed, rejected)
- `return_type` (full, partial, damaged)
- `payment_method` (cash, transfer, card, split, other)
- `payment_status` (pending, partial, paid, refunded, failed)
- `discount_type` (percentage, fixed)
- `sale_channel` (walk_in, online, whatsapp, phone, external_pos)

Tables (all `public`, RLS on, GRANT authenticated + service_role, audit + updated_at triggers):

- `discounts(id, company_id, code, name, discount_type, value numeric(18,4), starts_at, ends_at, is_active, min_subtotal numeric, metadata jsonb, timestamps, deleted_at)` — unique(company_id, code) where code not null.
- `sales(id, company_id, branch_id, sale_number text, customer_id nullable → contacts, channel sale_channel default 'walk_in', status sale_status default 'draft', subtotal, discount_total, tax_total, total, currency_code, payment_status payment_status default 'pending', notes, external_reference text nullable, completed_at nullable, created_by, timestamps, deleted_at)` — unique(company_id, sale_number).
- `sale_items(id, sale_id, product_id, quantity numeric, unit_price numeric, discount numeric default 0, tax_rate numeric default 0, tax_amount numeric default 0, total numeric, notes)`.
- `orders(id, company_id, branch_id, order_number, customer_id nullable, channel sale_channel, status order_status default 'draft', subtotal, discount_total, tax_total, total, currency_code, expected_at nullable, notes, external_reference, sale_id nullable → sales, created_by, timestamps, deleted_at)` — unique(company_id, order_number).
- `order_items(id, order_id, product_id, quantity, unit_price, discount, tax_amount, total, notes)`.
- `returns(id, company_id, branch_id, return_number, sale_id → sales, customer_id nullable, return_type, status return_status default 'draft', reason, subtotal, total, currency_code, restock boolean default true, created_by, timestamps, deleted_at)` — unique(company_id, return_number).
- `return_items(id, return_id, sale_item_id nullable → sale_items, product_id, quantity, unit_price, total, condition text)`.
- `payment_records(id, company_id, sale_id nullable, order_id nullable, method payment_method, status payment_status default 'pending', amount numeric, currency_code, reference text nullable, provider text nullable, paid_at nullable, notes, created_by, timestamps)` — CHECK ((sale_id is not null) or (order_id is not null)).

Numbering: default `sale_number`/`order_number`/`return_number` via DB function `next_document_number(company_id, prefix)` reading a per-company `document_sequences` table (upsert + increment) — added in this migration.

Triggers / RPCs:
- `complete_sale_atomic(_sale_id uuid)`:
  - Requires `sales.complete` permission.
  - Locks sale row, verifies status='draft'.
  - For each sale_item: insert `stock_movements(movement_type='sale', ...)` (only if `inventory` module enabled for company; otherwise skip inventory).
  - Update sale.status='completed', completed_at=now(), payment_status based on paid sum.
  - Enqueue `sale.completed` event.
- `record_return_atomic(_return_id uuid)`:
  - Requires `return.manage`.
  - For each return_item where restock: insert `stock_movements(movement_type='return', ...)`.
  - Update return.status='completed'; update parent sale.payment_status to 'refunded' if fully returned.
  - Enqueue `sale.returned`.
- `recompute_payment_status(_sale_id uuid)` helper called by payment insert trigger.
- Audit + updated_at triggers on all mutable tables.

RLS: scoped via `private.is_company_member(company_id)`, writes gated by `private.has_permission`. `sale_items`, `order_items`, `return_items` scoped via parent's company (subquery). Deletes soft (set deleted_at) except items which cascade with parent.

Permissions seeded into `public.permissions` and attached to `owner` + `admin` template roles (via existing `seed_role_permissions` pattern): `sales.view`, `sales.create`, `sales.complete`, `sales.cancel`, `order.view`, `order.manage`, `return.view`, `return.manage`, `payment.view`, `payment.record`, `discount.manage`.

## 4. Events

Registered in `src/platform/events/definitions/sales.ts`, imported by `src/platform/events/registry.ts`.

- `sale.created` v1 — audit only.
- `sale.completed` v1 — notification (owners, category `business`, deep link `/app/sales?id={{saleId}}`); jobs: `sales.dashboard.refresh` (debounced), future `accounting.journal.post`.
- `sale.cancelled` v1 — notification (creator).
- `sale.returned` v1 — notification (owners), audit.
- `order.created` v1 — notification (owners) when channel != walk_in.
- `order.completed` v1 — links to sale created from order.
- `payment.received` v1 — notification, category `billing`.

## 5. Server Functions

All `src/modules/sales/server/*.functions.ts`, `.middleware([requireSupabaseAuth])`, permission-gated, Zod-validated, audit-logged, publish via `events.publish`.

**Sales**
- `createDraftSale({ companyId, branchId, customerId?, channel?, items:[{productId, quantity, unitPrice, discount?}], discountId?, notes? })` → `sales.create`. Computes subtotal / discount / total; sale_number via `next_document_number`.
- `completeSale({ saleId })` → `sales.complete`; calls `complete_sale_atomic` RPC.
- `cancelSale({ saleId, reason? })` → `sales.cancel`.
- `listSales({ companyId, filters:{status, branchId, from, to, channel, customerId, q}, cursor, limit })` → keyset; joins customer name.
- `getSale({ id })` with items + payments.

**Orders**
- `createOrder({ ... })` mirrors sale draft shape with `channel` required. Status defaults `pending` for online/whatsapp/phone; `draft` for walk_in.
- `updateOrderStatus({ id, status })` — transitions validated. `completed` invokes `createSaleFromOrder` (internal helper) to materialize a completed sale + inventory decrement.
- `listOrders`, `getOrder`.

**Returns**
- `createReturn({ saleId, type, reason, items:[{saleItemId, quantity, condition, restock?}] })` → `return.manage`.
- `approveReturn({ id })` → `return.manage` — calls `record_return_atomic`.
- `listReturns`, `getReturn`.

**Payments**
- `recordPayment({ saleId?|orderId?, method, amount, reference?, provider?, notes? })` → `payment.record`. Inserts row, trigger recomputes parent payment_status, publishes `payment.received`.
- `listPayments`, `refundPayment` (v1: manual insert of negative-amount record).

**Discounts**
- `listDiscounts`, `createDiscount`, `updateDiscount`, `deleteDiscount` → `discount.manage`.

**Dashboard**
- `salesSummary({ companyId, branchId?, date? })` → { todaysSales{count,total}, ordersWaiting, paymentsReceived, returnsToday, topProducts[], averageSale }.

## 6. Integrated Mode — External POS ingestion

`src/routes/api/public/hooks/sales-ingest.ts` — TSS server route.
- Verifies `x-gevon-signature` HMAC (secret `SALES_INGEST_SECRET`, added via `secrets` tool if missing).
- Payload: `{ companyId, branchId, externalReference, occurredAt, items:[...], totals:{...}, payments:[...], customer?:{externalId, name, phone} }`.
- Loads `supabaseAdmin` inside handler; upserts `sales` with `channel='external_pos'`, status='completed', bypassing inventory decrement when the source system already owns stock (flag `syncInventory` on payload; default false).
- Enqueues `sale.completed` event.
- Returns `{ ok:true, saleId }`.

Never returns PII. Rate-limited implicitly by Cloudflare edge.

## 7. UI

- `/app/sales` layout with tabs Overview | Sales | Orders | Returns | Payments (child routes).
- Overview: widget grid using `listMyWidgets({ dashboardKey:'sales' })`.
- Sales: table (filter status/date/channel/customer), "New Sale" opens `NewSaleDialog` (ProductPicker → line items → discount → totals → Complete button). Draft can be saved and later completed.
- Orders: table with status kanban-lite filter; status transitions from row menu.
- Returns: table; "New Return" starts from a completed sale, picks items+quantities.
- Payments: table across sales/orders; RecordPayment dialog.
- All routes gated by module enabled + flag + permission; `throw notFound()` otherwise.
- Nav item registered under manifest with `permission: 'sales.view'`.

## 8. Business Rules

- Company must have `company_modules.enabled = true` for `sales` AND `feature_flags.sales.enabled` evaluated true.
- If `inventory` module also enabled → sale completion decrements stock; else skipped gracefully.
- Sale totals recomputed server-side; never trust client totals.
- Negative stock during completion aborts the whole sale (transaction rollback).
- Orders can be created without inventory; only completion materializes stock.
- Returns require a completed parent sale and cannot exceed original quantities per line.
- Payment sum > sale.total is rejected (unless method='refund' negative amount).
- Sale/Order/Return numbers monotonic per company via `document_sequences`.

## 9. Security

- RLS on every new table.
- All server fns use `requireSupabaseAuth` + `has_role`/`has_permission` checks.
- Public ingest route: HMAC only, no auth token; validates `companyId` belongs to a registered integration record (future — v1 accepts any signed payload for allowed companies list stored in `company_integrations` table? — defer to M7; for now secret is single global, payload company must exist and be active).
- Audit triggers on all mutable tables.
- Zod on all inputs; monetary values numeric(18,4); quantities > 0.

## 10. Testing

- Unit: total math (subtotal/discount/tax/total), payment status transitions, return quantity validation, document number monotonicity.
- Integration: RLS cross-company denial, permission gates (viewer cannot complete), `complete_sale_atomic` decrements inventory only when inventory module enabled, `record_return_atomic` restocks correctly, `sale.completed` event → notification insert, ingest hook verifies signature.
- Widget registry test: 6 sales widgets returned for `dashboardKey='sales'`.
- Playwright: enable sales module → create draft sale → complete → verify inventory decrement + notification → record payment → create partial return.

## 11. Delivery Order

1. Migration A — enums, `document_sequences`, `next_document_number()`, `discounts`, `sales`, `sale_items`, `orders`, `order_items`, `returns`, `return_items`, `payment_records`, GRANTs, RLS, permissions seed, audit + updated_at triggers.
2. Migration B — `complete_sale_atomic()`, `record_return_atomic()`, `recompute_payment_status()` + payment trigger.
3. `src/platform/events/definitions/sales.ts` + registry wiring.
4. `src/modules/sales/index.ts` manifest + `src/platform/registry.ts` wiring.
5. Server functions (sales, orders, returns, payments, discounts, summary).
6. Widgets + `_registry.ts`.
7. UI routes and components.
8. `src/routes/api/public/hooks/sales-ingest.ts` + `SALES_INGEST_SECRET` secret.
9. Docs `docs/architecture-m6.md`, `docs/sales/*.md`.
10. Tests.

**Exit criteria**: sales module can be enabled per company; users with proper perms can create/complete/cancel sales, manage orders, record returns and payments; inventory decrements on sale completion when inventory module active; ingest endpoint accepts signed external POS events; dashboard widgets render; RLS + permissions + audit enforced end-to-end; Core / CRM / Inventory untouched functionally.

Approve and I'll execute steps 1–10 in order.
