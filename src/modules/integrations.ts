/**
 * Integrations & Developer Platform module manifest (Milestone 14).
 * ------------------------------------------------------------------
 * Provider-agnostic integration layer: POS, payments, webhooks, OAuth,
 * API platform, import/export, sync engine, developer apps, and docs.
 *
 * No provider is hard-coded into the core. New adapters plug in via
 * the registry and adapter interfaces defined in `src/platform/integrations`.
 */
import type { ModuleManifest } from "@/platform/registry";

export const integrationsModule: ModuleManifest = {
  id: "integrations",
  name: "Integrations & Developer Platform",
  description:
    "Connect external POS, payments, e-commerce, logistics and more. Build on Gevon with API keys, webhooks, OAuth, and developer apps.",
  category: "general",
  icon: "plug",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core"],
  permissions: [
    { key: "integration.view", description: "View integrations and sync status" },
    { key: "integration.manage", description: "Connect, configure and manage integrations" },
    { key: "api.view", description: "View API keys and usage" },
    { key: "api.manage", description: "Create and manage API keys" },
    { key: "webhook.view", description: "View webhooks and delivery logs" },
    { key: "webhook.manage", description: "Create and manage webhooks" },
    { key: "developer.manage", description: "Manage developer apps and credentials" },
    { key: "data.import", description: "Import data into Gevon" },
    { key: "data.export", description: "Export data from Gevon" },
  ],
  navigation: [
    {
      label: "Integrations",
      to: "/app/integrations",
      icon: "plug",
      order: 90,
      permission: "integration.view",
      children: [
        { label: "All integrations", to: "/app/integrations", icon: "layout-grid" },
        { label: "API keys", to: "/app/integrations/api-keys", icon: "key", permission: "api.view" },
        { label: "Webhooks", to: "/app/integrations/webhooks", icon: "radio", permission: "webhook.view" },
        { label: "Data import / export", to: "/app/integrations/import-export", icon: "file-json", permission: "data.import" },
      ],
    },
  ],
  widgets: [
    { key: "integrations.active_count", name: "Active integrations", slots: ["dashboard"] },
    { key: "integrations.errors", name: "Integration errors", slots: ["dashboard"] },
    { key: "integrations.api_usage", name: "API usage today", slots: ["dashboard"] },
    { key: "integrations.webhook_health", name: "Webhook health", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    { key: "integration.integration_error_analysis", name: "Integration error analysis", description: "Analyse failed sync or webhook delivery errors and suggest fixes." },
    { key: "integration.data_import_mapping", name: "Data import mapping", description: "Suggest column mappings for CSV/Excel imports." },
    { key: "integration.sync_anomaly_detection", name: "Sync anomaly detection", description: "Detect unexpected gaps or spikes in integration sync data." },
    { key: "integration.integration_recommendations", name: "Integration recommendations", description: "Recommend integrations based on business profile." },
  ],
  featureFlags: [
    { key: "api_platform", name: "API Platform", description: "External API access with keys and scopes", defaultStatus: "beta" },
    { key: "webhooks", name: "Webhooks", description: "Outbound and inbound webhook subscriptions", defaultStatus: "beta" },
    { key: "developer_portal", name: "Developer Portal", description: "Developer applications and API docs", defaultStatus: "beta" },
    { key: "pos_integrations", name: "POS Integrations", description: "External POS system adapters", defaultStatus: "beta" },
    { key: "payment_integrations", name: "Payment Integrations", description: "External payment provider adapters", defaultStatus: "beta" },
    { key: "data_import_export", name: "Data Import / Export", description: "CSV, Excel and JSON data flows", defaultStatus: "beta" },
    { key: "oauth_connections", name: "OAuth Connections", description: "OAuth-based integration connections", defaultStatus: "beta" },
  ],
  defaultSettings: {
    defaultRateLimitPerMinute: 60,
    defaultRateLimitPerHour: 1000,
    webhookTimeoutSeconds: 30,
    webhookMaxRetries: 5,
  },
};
