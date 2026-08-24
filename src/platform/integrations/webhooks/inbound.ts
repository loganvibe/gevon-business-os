import { verifyWebhookSignature } from "./outbound";

export function verifyInboundWebhook(payload: string, signature: string, secret: string): boolean {
  return verifyWebhookSignature(payload, signature, secret);
}

export function validateInboundEvent(eventType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(eventType);
}

export function extractIdempotencyKey(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) return headers.get("X-Gevon-Idempotency-Key");
  return headers["X-Gevon-Idempotency-Key"] ?? null;
}

export function validateTimestamp(timestamp: string | number, maxAgeSeconds = 300): boolean {
  const ts = typeof timestamp === "string" ? Number(timestamp) : timestamp;
  if (!ts) return false;
  const age = Date.now() - ts;
  return age >= 0 && age <= maxAgeSeconds * 1000;
}
