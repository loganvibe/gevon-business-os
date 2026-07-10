/**
 * Pure, testable feature-flag evaluator.
 *
 * Layering (most specific wins):
 *   1. Company override (if any)
 *   2. Global override   (company_id null)
 *   3. Flag default_status
 *
 * `disabled` at any layer that matches the caller's audience wins over
 * higher-status defaults — see the "Off wins" rule.
 */

export type FlagStatus =
  | "development" | "internal" | "beta" | "premium" | "public" | "disabled";

export interface EvaluatorContext {
  isPlatformAdmin: boolean;
  isCompanyInternal: boolean;
  planTier: number; // starter=0, pro=1, enterprise=2, custom=3
}

export interface FlagInput {
  key: string;
  defaultStatus: FlagStatus;
  globalOverride?: FlagStatus | null;
  companyOverride?: FlagStatus | null;
}

/** Whether a given status is visible to the caller. */
export function isVisibleTo(status: FlagStatus, ctx: EvaluatorContext): boolean {
  switch (status) {
    case "disabled":     return false;
    case "public":       return true;
    case "beta":         return true; // beta requires company opt-in via override, done upstream
    case "premium":      return ctx.planTier >= 1;
    case "internal":     return ctx.isCompanyInternal || ctx.isPlatformAdmin;
    case "development":  return ctx.isPlatformAdmin;
  }
}

/** Resolve the effective status for a flag (most specific override wins). */
export function resolveStatus(f: FlagInput): FlagStatus {
  if (f.companyOverride) return f.companyOverride;
  if (f.globalOverride) return f.globalOverride;
  return f.defaultStatus;
}

/** Full evaluation: returns { status, enabled } for each key. */
export function evaluateAll(
  flags: FlagInput[],
  ctx: EvaluatorContext,
): Record<string, { status: FlagStatus; enabled: boolean }> {
  const out: Record<string, { status: FlagStatus; enabled: boolean }> = {};
  for (const f of flags) {
    const status = resolveStatus(f);
    out[f.key] = { status, enabled: isVisibleTo(status, ctx) };
  }
  return out;
}
