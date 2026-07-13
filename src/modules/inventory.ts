/**
 * Inventory & Product Management module manifest (Milestone 5).
 * Universal inventory engine — retail, supermarket, restaurant, pharmacy,
 * distribution, manufacturing. Not a POS.
 */
import type { ModuleManifest } from "@/platform/registry";

export const inventoryModule: ModuleManifest = {
  id: "inventory",
  name: "Inventory",
  description:
    "Products, stock, suppliers, and purchases. Track what you have, what's moving, and what needs attention.",
  category: "operations",
  icon: "package",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core"],
  permissions: [
    { key: "inventory.view", description: "View products and stock" },
    { key: "inventory.create", description: "Create new products" },
    { key: "inventory.update", description: "Edit products, categories, and stock settings" },
    { key: "inventory.delete", description: "Delete or archive products" },
    { key: "inventory.adjust", description: "Record stock adjustments and transfers" },
    { key: "supplier.view", description: "View suppliers" },
    { key: "supplier.manage", description: "Create and edit suppliers" },
    { key: "purchase.manage", description: "Record and manage supplier purchases" },
  ],
  navigation: [
    {
      label: "Inventory",
      to: "/app/inventory",
      icon: "package",
      order: 100,
      permission: "inventory.view",
      children: [
        { label: "Overview", to: "/app/inventory", icon: "layout-dashboard" },
        { label: "Products", to: "/app/products", icon: "boxes", permission: "inventory.view" },
        { label: "Suppliers", to: "/app/suppliers", icon: "truck", permission: "supplier.view" },
        { label: "Stock History", to: "/app/stock-history", icon: "history", permission: "inventory.view" },
      ],
    },
  ],
  widgets: [
    { key: "inventory.total_products", name: "Total products", slots: ["dashboard"] },
    { key: "inventory.stock_value", name: "Stock value", slots: ["dashboard"] },
    { key: "inventory.low_stock", name: "Low stock alerts", slots: ["dashboard"] },
    { key: "inventory.recent_activity", name: "Recent stock activity", slots: ["dashboard"] },
    { key: "inventory.top_products", name: "Top products", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    {
      key: "inventory.inventory_prediction",
      name: "Inventory prediction",
      description: "Forecast future stock needs from historical movement.",
    },
    {
      key: "inventory.low_stock_analysis",
      name: "Low-stock analysis",
      description: "Explain low-stock patterns and suggest reorder timing.",
    },
    {
      key: "inventory.product_profit_analysis",
      name: "Product profit analysis",
      description: "Identify high- and low-margin products from cost and selling prices.",
    },
    {
      key: "inventory.supplier_analysis",
      name: "Supplier analysis",
      description: "Rank suppliers by cost, lead time, and reliability.",
    },
  ],
  featureFlags: [
    { key: "inventory.enabled", name: "Inventory module", defaultStatus: "beta" },
    { key: "inventory.transfers", name: "Stock transfers between branches", defaultStatus: "beta" },
  ],
};
