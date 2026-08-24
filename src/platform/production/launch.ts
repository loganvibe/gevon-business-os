export type LaunchMode = "trial" | "beta" | "production" | "maintenance";

export interface LaunchConfig {
  mode: LaunchMode;
  enabledFeatures: string[];
  disabledFeatures: string[];
  maxCompanies: number;
  allowSignups: boolean;
  maintenanceMessage?: string;
}

export const launchConfigs: Record<LaunchMode, LaunchConfig> = {
  trial: {
    mode: "trial",
    enabledFeatures: ["core", "sales", "inventory", "crm"],
    disabledFeatures: ["integrations", "developer_portal", "ai_advanced"],
    maxCompanies: 100,
    allowSignups: true,
  },
  beta: {
    mode: "beta",
    enabledFeatures: ["core", "sales", "inventory", "crm", "expenses", "commerce", "integrations"],
    disabledFeatures: ["enterprise_advanced"],
    maxCompanies: 500,
    allowSignups: true,
  },
  production: {
    mode: "production",
    enabledFeatures: ["*"],
    disabledFeatures: [],
    maxCompanies: -1,
    allowSignups: true,
  },
  maintenance: {
    mode: "maintenance",
    enabledFeatures: [],
    disabledFeatures: ["*"],
    maxCompanies: 0,
    allowSignups: false,
    maintenanceMessage: "Gevon is undergoing scheduled maintenance. Please check back soon.",
  },
};

export function getLaunchMode(): LaunchMode {
  return (process.env.LAUNCH_MODE as LaunchMode) || "production";
}

export function getLaunchConfig(): LaunchConfig {
  return launchConfigs[getLaunchMode()] || launchConfigs.production;
}

export function isFeatureEnabled(feature: string): boolean {
  const config = getLaunchConfig();
  if (config.disabledFeatures.includes("*")) return false;
  if (config.enabledFeatures.includes("*")) return true;
  return config.enabledFeatures.includes(feature) && !config.disabledFeatures.includes(feature);
}

export function canSignup(): boolean {
  return getLaunchConfig().allowSignups;
}
