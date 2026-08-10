/**
 * Commerce Engine module manifest (Milestone 12).
 * -----------------------------------------------
 * A universal, provider-agnostic commerce layer. Businesses can sell
 * natively through Gevon (POS, storefront, QR, WhatsApp, delivery) OR keep
 * their existing POS and connect it later through the Integration Platform.
 *
 * Commerce never duplicates Sales, Inventory, CRM, Marketing or Finance —
 * it orchestrates them through existing server functions and the event bus.
 */
import type { ModuleManifest } from "@/platform/registry";

export const commerceModule: ModuleManifest = {
  id: "commerce",
  name: "Commerce",
  description:
    "Multi-channel commerce: native POS, online store, QR ordering, delivery and reservations. Works with or without an existing POS.",
  category: "sales",
  icon: "store",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core", "sales"],
  permissions: [
    { key: "commerce.view", description: "View the commerce workspace" },
    { key: "commerce.manage", description: "Manage commerce channels and configuration" },
    { key: "pos.access", description: "Use the point of sale and open cashier sessions" },
    { key: "pos.manage", description: "Manage registers and reconcile cashier sessions" },
    { key: "checkout.create", description: "Create carts and complete checkouts" },
    { key: "receipt.view", description: "View receipts" },
    { key: "receipt.manage", description: "Issue and send receipts" },
    { key: "store.manage", description: "Manage the online store and published catalogue" },
    { key: "delivery.manage", description: "Manage deliveries and delivery status" },
    { key: "reservation.manage", description: "Manage reservations" },
  ],
  navigation: [
    {
      label: "Commerce",
      to: "/app/commerce",
      icon: "store",
      order: 85,
      permission: "commerce.view",
      children: [
        { label: "Overview", to: "/app/commerce", icon: "layout-dashboard" },
        { label: "Point of sale", to: "/app/pos", icon: "scan-barcode", permission: "pos.access", flag: "commerce.native_pos" },
        { label: "Receipts", to: "/app/receipts", icon: "receipt", permission: "receipt.view" },
        { label: "Online store", to: "/app/store", icon: "globe", permission: "store.manage", flag: "commerce.online_store" },
        { label: "Deliveries", to: "/app/deliveries", icon: "truck", permission: "delivery.manage", flag: "commerce.delivery" },
        { label: "Reservations", to: "/app/reservations", icon: "calendar-clock", permission: "reservation.manage", flag: "commerce.reservations" },
      ],
    },
  ],
  widgets: [
    { key: "commerce.todays_sales", name: "Today's sales", slots: ["dashboard"] },
    { key: "commerce.open_orders", name: "Open orders", slots: ["dashboard"] },
    { key: "commerce.online_orders", name: "Online orders", slots: ["dashboard"] },
    { key: "commerce.pending_deliveries", name: "Pending deliveries", slots: ["dashboard"] },
    { key: "commerce.reservations", name: "Reservations", slots: ["dashboard"] },
    { key: "commerce.pos_sessions", name: "POS sessions", slots: ["dashboard"] },
    { key: "commerce.store_performance", name: "Store performance", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    { key: "commerce.commerce_sales_prediction", name: "Commerce sales prediction", description: "Predict channel-level sales volume." },
    { key: "commerce.product_recommendations", name: "Product recommendations", description: "Suggest products at checkout." },
    { key: "commerce.order_demand_prediction", name: "Order demand prediction", description: "Anticipate order volume per channel and time." },
    { key: "commerce.customer_purchase_recommendations", name: "Customer purchase recommendations", description: "Personalised suggestions from purchase history." },
    { key: "commerce.delivery_time_prediction", name: "Delivery time prediction", description: "Estimate realistic delivery windows." },
  ],
  featureFlags: [
    { key: "commerce.enabled", name: "Commerce engine", defaultStatus: "beta" },
    { key: "commerce.native_pos", name: "Native POS", defaultStatus: "beta" },
    { key: "commerce.online_store", name: "Online store", defaultStatus: "beta" },
    { key: "commerce.qr_ordering", name: "QR ordering", defaultStatus: "development" },
    { key: "commerce.delivery", name: "Delivery", defaultStatus: "beta" },
    { key: "commerce.reservations", name: "Reservations", defaultStatus: "beta" },
    { key: "commerce.self_checkout", name: "Self checkout", defaultStatus: "development" },
  ],
  defaultSettings: {
    businessType: "retail",
    posMode: "quick_sale",
    requireCustomerOnSale: false,
  },
};
