import { hashSecret, generateApiKey } from "@/platform/integrations/crypto";

export async function generateApiKeyPair(): Promise<{ key: string; prefix: string; hash: string }> {
  return generateApiKey();
}

export function hashApiKey(key: string): string {
  return hashSecret(key);
}

export function verifyApiKey(key: string, hash: string): boolean {
  return hashSecret(key) === hash;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export async function validateApiKeyScope(keyHash: string, requiredScope: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: key } = await (supabaseAdmin as any).from("api_keys").select("id").eq("key_hash", keyHash).eq("status", "active").maybeSingle();
  if (!key) return false;
  const { data: scopes } = await (supabaseAdmin as any).from("api_key_scopes").select("scope").eq("api_key_id", key.id);
  if (!scopes || scopes.length === 0) return false;
  return scopes.some((s: any) => s.scope === requiredScope || s.scope === "*");
}

export async function checkRateLimit(apiKeyId: string, _scope: string): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000);
  let { data: limit } = await (supabaseAdmin as any).from("api_rate_limits").select("*").eq("api_key_id", apiKeyId).maybeSingle();
  if (!limit) {
    const { data: inserted } = await (supabaseAdmin as any).from("api_rate_limits").insert({
      api_key_id: apiKeyId,
      company_id: (await (supabaseAdmin as any).from("api_keys").select("company_id").eq("id", apiKeyId).single())?.data?.company_id,
      current_minute: 0,
      current_hour: 0,
      window_started_at: now.toISOString(),
    }).select().single();
    limit = inserted;
  }
  const resetAt = new Date(new Date(limit.window_started_at).getTime() + 60 * 1000).toISOString();
  if (now > new Date(limit.window_started_at)) {
    await (supabaseAdmin as any).from("api_rate_limits").update({ current_minute: 0, current_hour: 0, window_started_at: now.toISOString() }).eq("id", limit.id);
    return { allowed: true, remaining: limit.limit_per_minute - 1, resetAt };
  }
  if (limit.current_minute >= limit.limit_per_minute) {
    return { allowed: false, remaining: 0, resetAt };
  }
  await (supabaseAdmin as any).from("api_rate_limits").update({ current_minute: limit.current_minute + 1 }).eq("id", limit.id);
  return { allowed: true, remaining: limit.limit_per_minute - limit.current_minute - 1, resetAt };
}

export async function recordApiUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any).from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyId);
}
