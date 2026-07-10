/**
 * Built-in "core" module manifest. Always enabled, cannot be disabled.
 * Owns the base navigation (Dashboard + Settings) that every company sees.
 */
import type { ModuleManifest } from "@/platform/registry";

export const coreModule: ModuleManifest = {
  id: "core",
  name: "Gevon Core",
  description: "Core platform: dashboard, users, roles, branches, audit, settings.",
  category: "core",
  icon: "shield-check",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: true,
  dependencies: [],
  permissions: [
    { key: "modules.view", description: "View module catalog and enabled modules" },
    { key: "modules.manage", description: "Enable and disable modules for the company" },
    { key: "flags.override", description: "Override feature flags for the company" },
    { key: "subscription.view", description: "View company subscription and plan" },
    { key: "subscription.manage", description: "Change company subscription and plan" },
  ],
  navigation: [
    { label: "Dashboard", to: "/app", icon: "layout-dashboard", order: 0 },
    {
      label: "Settings",
      to: "/app/settings",
      icon: "settings",
      order: 900,
      children: [
        { label: "Company", to: "/app/settings", icon: "building" },
        { label: "Team", to: "/app/settings/users", icon: "users", permission: "settings.users.manage" },
        { label: "Branches", to: "/app/settings/branches", icon: "building-2", permission: "branches.write" },
        { label: "Roles", to: "/app/settings/roles", icon: "shield-check", permission: "settings.users.manage" },
        { label: "Modules", to: "/app/settings/modules", icon: "blocks", permission: "modules.view" },
        { label: "Subscription", to: "/app/settings/subscription", icon: "gem", permission: "subscription.view" },
        { label: "Audit Log", to: "/app/settings/audit", icon: "scroll-text", permission: "audit.read" },
      ],
    },
  ],
  widgets: [
    { key: "welcome", name: "Welcome tile", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    {
      key: "core.summarize_audit",
      name: "Summarise recent audit activity",
      description: "Given a slice of audit rows, produce a plain-English summary for admins.",
    },
  ],
  featureFlags: [
    { key: "core.command_palette", name: "Command palette (⌘K)", defaultStatus: "beta" },
    { key: "core.dark_mode", name: "Dark mode", defaultStatus: "public" },
  ],
};
