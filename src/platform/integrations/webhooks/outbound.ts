import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(payload: object, secret: string): string {
  const body = JSON.stringify(payload);
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  return hmac.digest("hex");
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function deliverWebhook(webhook: any, event: any, _secret: string): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string; attempts: number }> {
  const maxAttempts = Number(webhook.retry_policy?.max_attempts ?? 5);
  let attempts = 0;
  let lastError: string | undefined;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(webhook.timeout_seconds ?? 30) * 1000);
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Gevon-Event": event.key, "X-Gevon-Delivery": crypto.randomUUID(), ...webhook.headers },
        body: JSON.stringify(event.payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        return { success: true, statusCode: res.status, responseBody: await res.text(), attempts };
      }
      lastError = `HTTP ${res.status}: ${await res.text()}`;
    } catch (e: any) {
      lastError = e.message ?? "Network error";
    }
    if (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempts), 30000)));
    }
  }
  return { success: false, error: lastError, attempts };
}
