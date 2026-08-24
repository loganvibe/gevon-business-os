import { z } from "zod";

export const securityHeadersSchema = z.object({
  "X-Content-Type-Options": z.literal("nosniff"),
  "X-Frame-Options": z.literal("DENY"),
  "X-XSS-Protection": z.literal("1; mode=block"),
  "Strict-Transport-Security": z.string().min(1),
  "Content-Security-Policy": z.string().min(1),
  "Referrer-Policy": z.string().min(1),
});

export type SecurityHeaders = z.infer<typeof securityHeadersSchema>;

export const defaultSecurityHeaders: SecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export const inputValidationRules = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  forbiddenPatterns: ["<script", "javascript:", "data:text/html", "vbscript:", "onload=", "onerror="],
};

export function sanitizeString(input: string): string {
  return input.replace(/[<>]/g, "").trim().slice(0, inputValidationRules.maxStringLength);
}

export function validatePagination(page: number, limit: number): { page: number; limit: number } {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
  return { page: safePage, limit: safeLimit };
}

export function maskSensitiveValue(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars * 2) return "*".repeat(value.length);
  return value.slice(0, visibleChars) + "*".repeat(Math.max(0, value.length - visibleChars * 2)) + value.slice(-visibleChars);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getPublicEnv(): Record<string, string | undefined> {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    APP_URL: process.env.APP_URL,
    VERSION: process.env.APP_VERSION,
  };
}
