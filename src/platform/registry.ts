/**
 * Gevon Core Platform — Module Registry
 * -------------------------------------
 * In-code source of truth for every module that ships with the platform.
 * The DB (`public.modules`) mirrors this registry — kept in sync by
 * `admin.syncManifests()` (see `src/platform/admin.functions.ts`).
 *
 * Each module registers routes, navigation, permissions, dependencies,
 * widgets, and AI capabilities. Business modules (CRM, HR, Payroll…) will
 * be added to this file (or split per-module later) in subsequent milestones.
 */

import { z } from "zod";
import { coreModule } from "@/modules/core";
import { inventoryModule } from "@/modules/inventory";

// ------------------------------ Types ---------------------------------
export type SubscriptionTier = "starter" | "professional" | "enterprise" | "custom";
export type ModuleCategory =
  | "core" | "sales" | "operations" | "finance" | "people" | "customer"
  | "productivity" | "analytics" | "ai" | "general";

export interface NavItem {
  label: string;
  /** Route path relative to the customer portal, e.g. `/app/crm`. */
  to: string;
  icon?: string;
  /** Optional permission required to show this item. */
  permission?: string;
  /** Optional feature flag gating this item. */
  flag?: string;
  /** Nested items (rendered as a collapsible group). */
  children?: NavItem[];
  order?: number;
}

export interface AICapability {
  key: string;
  name: string;
  description: string;
  /** JSON-schema-like descriptor of expected input. */
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface ModuleWidget {
  key: string;
  name: string;
  /** Where the widget may render: dashboard, sidebar, etc. */
  slots: Array<"dashboard" | "sidebar" | "topbar" | "command-palette">;
}

export interface ModulePermission {
  key: string;
  description: string;
}

export interface ModuleFeatureFlag {
  key: string;
  name: string;
  description?: string;
  defaultStatus: "development" | "internal" | "beta" | "premium" | "public" | "disabled";
}

export interface ModuleManifest {
  id: string;                         // unique slug, e.g. "crm"
  name: string;
  description: string;
  category: ModuleCategory;
  icon: string;                       // lucide icon name
  version: string;                    // semver
  subscriptionTier: SubscriptionTier; // minimum plan
  isCore: boolean;                    // core modules are always on
  dependencies: string[];             // module ids
  permissions: ModulePermission[];    // seeded into public.permissions
  navigation: NavItem[];
  widgets: ModuleWidget[];
  aiCapabilities: AICapability[];
  featureFlags: ModuleFeatureFlag[];
  /** Optional module-specific default settings. */
  defaultSettings?: Record<string, unknown>;
}

// ------------------------- Zod validator ------------------------------
export const ModuleManifestSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string(),
  icon: z.string().min(1),
  version: z.string().min(1),
  subscriptionTier: z.enum(["starter", "professional", "enterprise", "custom"]),
  isCore: z.boolean(),
  dependencies: z.array(z.string()),
  permissions: z.array(z.object({ key: z.string(), description: z.string() })),
  navigation: z.array(z.any()),
  widgets: z.array(z.any()),
  aiCapabilities: z.array(z.any()),
  featureFlags: z.array(z.any()),
  defaultSettings: z.record(z.unknown()).optional(),
});

// ---------------------------- Registry --------------------------------
const MODULES: ModuleManifest[] = [coreModule];

export function registerModule(m: ModuleManifest) {
  ModuleManifestSchema.parse(m);
  if (MODULES.find((x) => x.id === m.id)) {
    throw new Error(`Module already registered: ${m.id}`);
  }
  MODULES.push(m);
}

export function allModules(): ModuleManifest[] {
  return MODULES.slice();
}

export function getModule(id: string): ModuleManifest | undefined {
  return MODULES.find((m) => m.id === id);
}

/** Simple SHA-256-ish hash for manifest drift detection (browser + worker). */
export async function hashManifest(m: ModuleManifest): Promise<string> {
  const json = JSON.stringify(m);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// -------------------------- Dependency utils --------------------------
/** Topological order of module ids, or throw on cycle / missing dep. */
export function resolveDependencyOrder(ids: string[]): string[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const out: string[] = [];
  function visit(id: string, stack: string[]) {
    if (visited.has(id)) return;
    if (temp.has(id)) throw new Error(`Cyclic module dependency: ${[...stack, id].join(" -> ")}`);
    const m = getModule(id);
    if (!m) throw new Error(`Unknown module: ${id}`);
    temp.add(id);
    for (const dep of m.dependencies) visit(dep, [...stack, id]);
    temp.delete(id);
    visited.add(id);
    out.push(id);
  }
  for (const id of ids) visit(id, []);
  return out;
}

/** Given an enabled set, list dependents (modules that would break if `id` is disabled). */
export function findDependents(id: string, enabled: string[]): string[] {
  return enabled.filter((e) => {
    const m = getModule(e);
    return m ? m.dependencies.includes(id) : false;
  });
}
