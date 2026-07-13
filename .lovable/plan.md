# Milestone 5 — Inventory & Product Management Foundation

Universal inventory engine that plugs into the Gevon module system. Reuses M1–M4 (auth, tenancy, RBAC, RLS, audit, module registry, event bus, notifications). Not a POS, not industry-specific — a foundation for Retail, Supermarket, Restaurant, Pharmacy, Distribution, Manufacturing.

Core rule: do not modify Gevon Core unless required for stability. CRM (M4) untouched.

## 1. Scope

**In scope**
- Inventory module manifest (`id: inventory`, category `operations`, tier `starter`, depends on `core`), registered via `src/platform/registry.ts`.
- Entities: products, product_categories, inventory_items (per branch), stock_movements (immutable log), suppliers, supplier_products, purchase_records + purchase_record_items.
- Multi-branch stock: one `inventory_items` row per (product, branch).
- Stock movement types: purchase, sale, adjustment, damaged, expired, transfer_in, transfer_out.
- Server functions for products / stock / suppliers / purchases with permission + Zod validation + audit.
- Event Bus: `inventory.*` events wired through existing dispatcher; low-stock detection triggers notifications.
- Dashboard widgets (Total products, Stock value, Low stock alerts, Recent activity, Top products) registered with dashboard widget registry created in M4.
- Feature flag `inventory.enabled` (default: beta). Module gated by both flag + `company_modules.enabled`.
- Permissions: `inventory.view/create/update/delete/adjust`, `supplier.view/manage`, `purchase.manage`.
- AI capabilities registered in manifest only (no LLM calls): `inventory_prediction`, `low_stock_analysis`, `product_profit_analysis`, `supplier_analysis`.
- UI routes under `/app/inventory`, `/app/products`, `/app/suppliers`, `/app/stock-history`.

**Out of scope**
- Real POS integration, real AI models, batch/lot/serial tracking, expiry management UI (schema-ready only), barcode scanning hardware, manufacturing BOM, purchase order approvals workflow.

## 2. Architecture

```text
src/modules/inventory/
  index.ts                       # manifest + registerModule(inventoryModule)
  events.ts                      # inventory event definitions
  widgets/
    TotalProducts.tsx  StockValue.tsx  LowStockAlerts.tsx
    RecentActivity.tsx  TopProducts.tsx  _registry.ts
  server/
    products.functions.ts
    categories.functions.ts
    inventory.functions.ts       # receiveStock / adjustStock / transferStock / getInventory / getLowStockItems
    suppliers.functions.ts
    purchases.functions.ts
    movements.functions.ts       # list/query stock movements
  components/
    ProductsTable.tsx  ProductForm.tsx
    InventoryTable.tsx  StockAdjustDialog.tsx  ReceiveStockDialog.tsx
    SuppliersTable.tsx  SupplierForm.tsx
    StockMovementList.tsx  LowStockList.tsx

src/platform/events/definitions/inventory.ts   # re-exports module events

src/routes/_authenticated/
  app.inventory.tsx              # layout: Overview | Products | Stock | Suppliers | History
  app.inventory.index.tsx        # inventory dashboard
  app.products.tsx  app.products.$id.tsx
  app.suppliers.tsx  app.suppliers.$id.tsx
  app.stock-history.tsx

docs/
  architecture-m5.md
  inventory/entities.md  inventory/events.md  inventory/permissions.md
```

## 3. Database

Enums:
- `stock_movement_type` (purchase, sale, adjustment, damaged, expired, transfer_in, transfer_out, opening_balance, return)
- `product_status` (active, archived, draft)
- `product_unit` (piece, kg, g, l, ml, box, pack, carton, dozen, other)

Tables (all `public`, RLS on, GRANT to authenticated + service_role, audit trigger, `updated_at` trigger):

- `product_categories(id, company_id, parent_id nullable, name, description, timestamps, deleted_at)` — unique(company_id, name, parent_id).
- `products(id, company_id, name, description, sku, barcode, category_id nullable, unit product_unit, cost_price numeric, selling_price numeric, currency_code, image_url, status product_status, metadata jsonb, created_by, timestamps, deleted_at)` — unique(company_id, sku) where sku not null; unique(company_id, barcode) where barcode not null.
- `inventory_items(id, company_id, product_id, branch_id, quantity numeric, reserved_quantity numeric, minimum_stock_level numeric, maximum_stock_level numeric, reorder_point numeric, last_movement_at, timestamps)` — unique(product_id, branch_id).
- `stock_movements(id, company_id, product_id, branch_id, movement_type, quantity numeric, previous_quantity numeric, new_quantity numeric, unit_cost numeric nullable, reference_type text nullable, reference_id uuid nullable, notes, created_by, created_at)` — append-only (no update trigger; RLS blocks update/delete except service_role).
- `suppliers(id, company_id, name, phone, email, address jsonb, tax_id, notes, status, timestamps, deleted_at)`.
- `supplier_products(supplier_id, product_id, supplier_sku, cost_price numeric, lead_time_days int, primary key(supplier_id, product_id))`.
- `purchase_records(id, company_id, supplier_id nullable, branch_id, reference, purchase_date, total_amount numeric, currency_code, status text, notes, created_by, timestamps, deleted_at)`.
- `purchase_record_items(id, purchase_id, product_id, quantity numeric, unit_cost numeric, total numeric)`.

Triggers:
- `apply_stock_movement()` — BEFORE INSERT on `stock_movements`: locks matching `inventory_items` row (create if missing), sets `previous_quantity`, computes `new_quantity` from movement type sign, updates `inventory_items.quantity` + `last_movement_at`. Rejects negative resulting stock unless movement_type in (adjustment, damaged, expired).
- Low-stock detector — AFTER INSERT on `stock_movements`: if `new_quantity <= minimum_stock_level` and previous_quantity was above, insert into `event_queue` a `inventory.stock.low_detected` event.
- Deal status–style derivation NOT needed here.
- Audit + `updated_at` triggers on mutable tables.

RLS: all tables scoped via `private.is_company_member(company_id)`; writes gated by `private.has_permission(company_id, '<perm>')`. Stock movements: INSERT requires `inventory.adjust` OR `inventory.create`; UPDATE/DELETE denied for `authenticated`.

Seeds (per company, via trigger on `company_modules` insert where module_id='inventory'):
- Default categories: Uncategorized.
- Nothing else — data comes from user.

Permissions seed (inserted into `public.permissions`, granted to owner + admin roles): `inventory.view`, `inventory.create`, `inventory.update`, `inventory.delete`, `inventory.adjust`, `supplier.view`, `supplier.manage`, `purchase.manage`.

## 4. Events

Registered in `src/modules/inventory/events.ts`, re-exported by `src/platform/events/definitions/inventory.ts`, added to `src/platform/events/registry.ts` imports.

- `inventory.product.created` v1 — notification to creator (low priority).
- `inventory.product.updated` v1.
- `inventory.product.archived` v1.
- `inventory.stock.received` v1 — publishes on purchase-type movement; notification category `business`.
- `inventory.stock.adjusted` v1 — adjustment/damaged/expired.
- `inventory.stock.transferred` v1 — pair of transfer_out+transfer_in.
- `inventory.stock.low_detected` v1 — notification to owners with deep link `/app/inventory?filter=low-stock`; job `inventory.low_stock.digest` (daily rollup).
- `inventory.supplier.created` v1.
- `inventory.purchase.recorded` v1 — notification + audit; downstream Accounting can subscribe later.

## 5. Server Functions

All under `src/modules/inventory/server/*.functions.ts`, `.middleware([requireSupabaseAuth])`, permission check via `private.has_permission`, Zod-validated input, publishing events through `events.publish` (M3 bus).

**Products**
- `listProducts({ companyId, filters, cursor, limit })` — keyset paginated, joins inventory totals across branches.
- `getProduct({ id })`.
- `createProduct(input)` — `inventory.create`.
- `updateProduct({ id, patch })` — `inventory.update`.
- `archiveProduct({ id })` / `deleteProduct({ id })` — `inventory.delete`.

**Categories**
- `listCategories`, `createCategory`, `updateCategory`, `deleteCategory` — `inventory.update` (management is admin-lite).

**Inventory / Stock**
- `getInventory({ companyId, branchId?, filters, cursor, limit })`.
- `receiveStock({ productId, branchId, quantity, unitCost?, supplierId?, notes? })` — inserts stock_movement type=purchase; publishes `inventory.stock.received`; `inventory.adjust` OR `purchase.manage`.
- `adjustStock({ productId, branchId, delta, reason, notes? })` — movement type=adjustment/damaged/expired; publishes `inventory.stock.adjusted`; `inventory.adjust`.
- `transferStock({ productId, fromBranchId, toBranchId, quantity, notes? })` — inserts paired movements atomically; publishes `inventory.stock.transferred`.
- `getLowStockItems({ companyId, branchId? })` — where quantity <= minimum_stock_level.
- `listStockMovements({ companyId, filters, cursor, limit })`.

**Suppliers**
- `listSuppliers`, `getSupplier`, `createSupplier` (`supplier.manage`), `updateSupplier`, `archiveSupplier`.
- `linkSupplierProduct({ supplierId, productId, supplierSku?, costPrice?, leadTimeDays? })`.

**Purchases**
- `recordPurchase({ supplierId?, branchId, items:[{productId,quantity,unitCost}], purchaseDate, notes? })` — atomic: creates purchase_records + items + one stock_movement per item (type=purchase). Publishes `inventory.purchase.recorded`.
- `listPurchases`, `getPurchase`.

**Dashboard**
- `inventorySummary({ companyId, branchId? })` — { totalProducts, stockValue, lowStockCount, recentMovements, topProducts }.

## 6. UI

- `/app/inventory` layout: tabs Overview | Products | Stock | Suppliers | History (sub-routes).
- Overview: widget grid via `listMyWidgets({ dashboardKey: 'inventory' })`.
- Products: table (search/filter by category/status), create/edit dialog with shadcn form + zod, image URL, cost/selling prices, unit, category picker.
- Stock: inventory table per branch, actions Receive / Adjust / Transfer opening shadcn Dialog forms.
- Suppliers: table + form.
- Stock History: filterable movement log (product, branch, type, date range).
- Low-stock badge in `/app/inventory` nav (from `getLowStockItems.count`).
- All gated by module enabled + feature flag `inventory.enabled` + `inventory.view` perm; loaders `throw notFound()` otherwise.

## 7. Module Registration

- `src/modules/inventory/index.ts` exports `inventoryModule` manifest (nav items, permissions, widgets, AI capabilities, feature flag `inventory.enabled` default `beta`).
- `src/platform/registry.ts` imports and pushes it to `MODULES`.
- `src/platform/events/registry.ts` imports `inventoryEvents`.
- `admin.syncManifests()` and `admin.syncEvents()` will mirror to DB on next admin run.
- Dashboard widget registry (introduced in M4 planning) gets the 5 widgets in `_registry.ts`.

## 8. Business Rules

- Company must have `company_modules` row for `inventory` with `enabled = true` AND feature flag evaluated true → module surfaces.
- Cost/selling prices in company currency; stored numeric(18,4).
- `sku` and `barcode` unique per company when set.
- Stock cannot go negative except for adjustment/damaged/expired movement types.
- Deleting a product with existing movements = archive (soft delete). Hard delete only when no movements.
- Purchases are atomic (all items apply, or none) — transaction inside server fn using `supabase.rpc('record_purchase_atomic', ...)` DB function.

## 9. Security

- RLS on every new table via `private.is_company_member` + permission functions.
- `stock_movements` append-only for `authenticated` (INSERT with permission check; UPDATE/DELETE denied).
- `supabaseAdmin` only for maintenance/webhooks (not used by module server fns).
- Zod validation on all inputs; numeric bounds enforced (quantity > 0 where relevant).
- Audit triggers on all mutable tables via `public.audit_m2_change()`.

## 10. Testing

- Unit: stock movement math (previous → new), transfer atomicity, low-stock trigger fires exactly once on crossing threshold, purchase-record atomicity.
- Integration: RLS cross-company denial; permission gates (viewer cannot adjust); event publish (`inventory.stock.received`) → notification insert.
- Dashboard widget registry test: 5 inventory widgets returned for `dashboardKey='inventory'`.
- Playwright: enable inventory module for a company → create product → receive stock → adjust below minimum → notification bell increments.

## 11. Delivery Order

1. Migration A — enums, tables (categories, products, inventory_items, stock_movements, suppliers, supplier_products, purchase_records, purchase_record_items), GRANTs, RLS, permissions seed, audit + updated_at triggers.
2. Migration B — `apply_stock_movement()` trigger + low-stock detector trigger + `record_purchase_atomic()` RPC + `seed_inventory_defaults()` trigger on `company_modules`.
3. `src/modules/inventory/events.ts` + `src/platform/events/definitions/inventory.ts` + registry wiring.
4. `src/modules/inventory/index.ts` manifest + `src/platform/registry.ts` wiring.
5. Server functions (products, categories, inventory, suppliers, purchases, movements).
6. Widgets + `_registry.ts`.
7. UI routes and components.
8. Docs `docs/architecture-m5.md`, `docs/inventory/*.md`.
9. Tests (unit + integration + one Playwright flow).

**Exit criteria**: inventory module can be enabled per company; users with proper perms can manage products/stock/suppliers/purchases; low-stock alerts fire through the bus and bell; dashboard widgets render; RLS + permissions + audit enforced end-to-end; CRM/Core untouched.

Approve and I'll execute steps 1–9 in order.
