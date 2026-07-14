/**
 * Sales & Order Management module manifest (Milestone 6).
 * Universal Sales Engine — supports walk-in, online, WhatsApp, phone,
 * and external POS-ingested transactions. Not a POS replacement.
 */
import type { ModuleManifest } from "@/platform/registry";

export const salesModule: ModuleManifest = {
  id: "sales",
  name: "Sales",
  description:
    "Sales, orders, returns, and payments. Works standalone or alongside an existing POS.",
  category: "sales",
  icon: "shopping-cart",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core"],
  permissions: [
    { key: "sales.view", description: "View sales" },
    { key: "sales.create", description: "Create draft sales" },
    { key: "sales.complete", description: "Complete sales" },
    { key: "sales.cancel", description: "Cancel sales" },
    { key: "order.view", description: "View orders" },
    { key: "order.manage", description: "Create and update orders" },
    { key: "return.view", description: "View returns" },
    { key: "return.manage", description: "Create and process returns" },
    { key: "payment.view", description: "View payments" },
    { key: "payment.record", description: "Record payments" },
    { key: "discount.manage", description: "Manage discounts" },
  ],
  navigation: [
    {
      label: "Sales",
      to: "/app/sales",
      icon: "shopping-cart",
      order: 90,
      permission: "sales.view",
      children: [
        { label: "Overview", to: "/app/sales", icon: "layout-dashboard" },
        { label: "Orders", to: "/app/orders", icon: "clipboard-list", permission: "order.view" },
        { label: "Returns", to: "/app/returns", icon: "undo-2", permission: "return.view" },
        { label: "Payments", to: "/app/payments", icon: "wallet", permission: "payment.view" },
      ],
    },
  ],
  widgets: [
    { key: "sales.todays_sales", name: "Today's sales", slots: ["dashboard"] },
    { key: "sales.orders_waiting", name: "Orders waiting", slots: ["dashboard"] },
    { key: "sales.payments_received", name: "Payments received", slots: ["dashboard"] },
    { key: "sales.returns_today", name: "Returns today", slots: ["dashboard"] },
    { key: "sales.top_products", name: "Top selling products", slots: ["dashboard"] },
    { key: "sales.average_sale", name: "Average sale value", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    { key: "sales.sales_forecast", name: "Sales forecast", description: "Predict future sales from historical data." },
    { key: "sales.customer_purchase_patterns", name: "Customer purchase patterns", description: "Identify recurring purchase patterns per customer." },
    { key: "sales.product_recommendations", name: "Product recommendations", description: "Recommend products based on sale history." },
    { key: "sales.sales_trend_analysis", name: "Sales trend analysis", description: "Explain sales trends and anomalies." },
  ],
  featureFlags: [
    { key: "sales.enabled", name: "Sales module", defaultStatus: "beta" },
    { key: "sales.integrated_pos", name: "External POS ingestion", defaultStatus: "beta" },
  ],
};
