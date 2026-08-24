const enc = new TextEncoder();

let cachedKey: CryptoKey | null = null;

async function getSubtle(): Promise<SubtleCrypto> {
  return (globalThis as any).crypto?.subtle ?? (await import("node:crypto")).webcrypto.subtle;
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const subtle = await getSubtle();
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY || "dev-integration-key-change-in-production";
  cachedKey = await subtle.importKey("raw", enc.encode(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return cachedKey;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const subtle = await getSubtle();
  const iv = (globalThis as any).crypto?.getRandomValues?.(new Uint8Array(12)) ?? require("node:crypto").webcrypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const cipher = await subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const buf = new Uint8Array(cipher);
  const combined = new Uint8Array(iv.length + buf.length);
  combined.set(iv);
  combined.set(buf, iv.length);
  return Buffer.from(combined).toString("base64");
}

export async function decryptSecret(ciphertext: string): Promise<string> {
  const subtle = await getSubtle();
  const raw = Buffer.from(ciphertext, "base64");
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const key = await getKey();
  const plain = await subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

export function hashSecret(secret: string): string {
  return require("node:crypto").createHash("sha256").update(secret).digest("hex");
}

export function generateWebhookSecret(): string {
  const bytes = require("node:crypto").webcrypto.getRandomValues(new Uint8Array(32));
  return "whsec_" + Buffer.from(bytes).toString("base64url");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const bytes = require("node:crypto").webcrypto.getRandomValues(new Uint8Array(32));
  const key = Buffer.from(bytes).toString("base64url");
  const prefix = key.slice(0, 8);
  const hash = hashSecret(key);
  return { key, prefix, hash };
}
