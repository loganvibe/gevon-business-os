/**
 * Enterprise Operations Engine module manifest (Milestone 13).
 * ----------------------------------------------------------
 * Gevon's multi-branch, warehouse, procurement, vendor, asset,
 * maintenance, and fleet foundation. Designed to grow with a business
 * from one branch to a full enterprise operation without leaving Gevon.
 */
import type { ModuleManifest } from "@/platform/registry";

export const enterpriseModule: ModuleManifest = {
  id: "enterprise",
  name: "Enterprise Operations",
  description:
    "Multi-branch operations, warehouses, procurement, vendors, assets, maintenance, and fleet management.",
  category: "operations",
  icon: "building-2",
  version: "1.0.0",
  subscriptionTier: "professional",
  isCore: false,
  dependencies: ["core", "inventory", "people", "workflow", "expenses"],
  permissions: [
    { key: "warehouse.view", description: "View warehouses and stock locations" },
    { key: "warehouse.manage", description: "Create and manage warehouses and locations" },
    { key: "procurement.view", description: "View purchase requests and orders" },
    { key: "procurement.manage", description: "Create and manage purchase requests and orders" },
    { key: "procurement.approve", description: "Approve purchase requests" },
    { key: "vendor.view", description: "View vendors and supplier profiles" },
    { key: "vendor.manage", description: "Create and manage vendors" },
    { key: "asset.view", description: "View assets and assignments" },
    { key: "asset.manage", description: "Create and manage assets and categories" },
    { key: "maintenance.view", description: "View maintenance requests and records" },
    { key: "maintenance.manage", description: "Create and manage maintenance" },
    { key: "fleet.view", description: "View vehicles, trips and fuel" },
    { key: "fleet.manage", description: "Create and manage fleet" },
    { key: "branch.view", description: "View branches" },
    { key: "branch.manage", description: "Create, edit and archive branches" },
    { key: "document.view", description: "View enterprise documents" },
    { key: "document.manage", description: "Upload and manage enterprise documents" },
  ],
  navigation: [
    {
      label: "Operations",
      to: "/app/operations",
      icon: "building-2",
      order: 80,
      permission: "warehouse.view",
      children: [
        { label: "Overview", to: "/app/operations", icon: "layout-dashboard", exact: true },
        { label: "Branches", to: "/app/branches", icon: "building-2", permission: "branch.view" },
        { label: "Warehouses", to: "/app/warehouses", icon: "warehouse", permission: "warehouse.view" },
        { label: "Procurement", to: "/app/procurement", icon: "shopping-cart", permission: "procurement.view" },
        { label: "Vendors", to: "/app/vendors", icon: "truck", permission: "vendor.view" },
        { label: "Assets", to: "/app/assets", icon: "monitor", permission: "asset.view" },
        { label: "Maintenance", to: "/app/maintenance", icon: "wrench", permission: "maintenance.view" },
        { label: "Fleet", to: "/app/fleet", icon: "car", permission: "fleet.view" },
      ],
    },
  ],
  widgets: [
    { key: "enterprise.branch_performance", name: "Branch performance", slots: ["dashboard"] },
    { key: "enterprise.warehouse_stock", name: "Warehouse stock overview", slots: ["dashboard"] },
    { key: "enterprise.pending_pos", name: "Pending purchase orders", slots: ["dashboard"] },
    { key: "enterprise.supplier_performance", name: "Supplier performance", slots: ["dashboard"] },
    { key: "enterprise.asset_status", name: "Asset status summary", slots: ["dashboard"] },
    { key: "enterprise.maintenance_due", name: "Maintenance due", slots: ["dashboard"] },
    { key: "enterprise.fleet_status", name: "Fleet status", slots: ["dashboard"] },
    { key: "enterprise.alerts", name: "Enterprise alerts", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    {
      key: "enterprise.branch_performance_analysis",
      name: "Branch performance analysis",
      description: "Compare branch revenue, costs, and efficiency.",
    },
    {
      key: "enterprise.supplier_risk_analysis",
      name: "Supplier risk analysis",
      description: "Rank suppliers by reliability and cost trends.",
    },
    {
      key: "enterprise.procurement_optimization",
      name: "Procurement optimization",
      description: "Suggest reorder timing and bulk purchase opportunities.",
    },
    {
      key: "enterprise.asset_maintenance_prediction",
      name: "Asset maintenance prediction",
      description: "Predict when assets will need service or replacement.",
    },
    {
      key: "enterprise.fleet_cost_analysis",
      name: "Fleet cost analysis",
      description: "Analyze fuel, maintenance, and utilization costs.",
    },
    {
      key: "enterprise.warehouse_optimization",
      name: "Warehouse optimization",
      description: "Suggest stock redistribution across branches.",
    },
  ],
  featureFlags: [
    { key: "enterprise.enabled", name: "Enterprise Operations module", defaultStatus: "internal" },
    { key: "enterprise.multi_branch", name: "Multi-branch operations", defaultStatus: "public" },
    { key: "enterprise.warehouses", name: "Warehouse management", defaultStatus: "beta" },
    { key: "enterprise.advanced_procurement", name: "Advanced procurement", defaultStatus: "beta" },
    { key: "enterprise.vendor_management", name: "Vendor management", defaultStatus: "beta" },
    { key: "enterprise.asset_management", name: "Asset management", defaultStatus: "internal" },
    { key: "enterprise.maintenance", name: "Maintenance management", defaultStatus: "internal" },
    { key: "enterprise.fleet_management", name: "Fleet management", defaultStatus: "internal" },
  ],
};
