export type IndustryKey =
  | "retail"
  | "restaurant"
  | "pharmacy"
  | "wholesale"
  | "construction"
  | "manufacturing"
  | "service"
  | "hospitality"
  | "education"
  | "agriculture";

export type BusinessSize = "sole_proprietor" | "micro" | "small" | "medium" | "large";

export type OnboardingStepKey =
  | "business_name"
  | "business_type"
  | "branch"
  | "business_size"
  | "operations"
  | "capabilities"
  | "workspace"
  | "import"
  | "complete";

export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface IndustryProfile {
  id: string;
  key: IndustryKey;
  name: string;
  description: string;
  icon: string;
  recommendedModules: string[];
  recommendedWidgets: string[];
  defaultNavigation: Record<string, unknown>[];
  terminology: Record<string, string>;
  defaultWorkflows: Record<string, unknown>[];
  defaultPermissions: string[];
  relevantReports: string[];
  relevantKpis: string[];
  relevantEvents: string[];
  relevantAiCapabilities: string[];
  featureDefaults: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  id: string;
  companyId: string;
  industryKey: IndustryKey;
  businessSize?: BusinessSize;
  primaryOperations: string[];
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt?: string;
  dashboardConfig: Record<string, unknown>;
  customization: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingState {
  id: string;
  companyId: string;
  currentStep: OnboardingStepKey;
  completedSteps: OnboardingStepKey[];
  data: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
  component: string;
}

export interface ModuleRecommendation {
  moduleId: string;
  name: string;
  reason: string;
  priority: "required" | "recommended" | "optional";
  category: string;
}

export interface SystemHealthCheck {
  checkName: string;
  status: "healthy" | "degraded" | "down";
  message?: string;
  details: Record<string, unknown>;
  checkedAt: string;
}
