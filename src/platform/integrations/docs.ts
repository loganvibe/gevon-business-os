export interface DocSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface DocPage {
  id: string;
  title: string;
  description: string;
  sections: DocSection[];
}

export const API_DOCS: DocPage[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Quick start guide for the Gevon API.",
    sections: [
      { id: "overview", title: "Overview", content: "The Gevon API lets you read and write business data programmatically. All endpoints are RESTful and return JSON.", order: 0 },
      { id: "base-url", title: "Base URL", content: "Use your Gevon instance URL as the base: https://api.gevon.com/v1", order: 1 },
      { id: "first-request", title: "First request", content: "Create an API key in Settings > Integrations > API keys, then call GET /v1/companies with the header Authorization: Bearer <key>.", order: 2 },
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    description: "API key and OAuth authentication methods.",
    sections: [
      { id: "api-keys", title: "API keys", content: "Pass your key in the Authorization header as a Bearer token. Keys are scoped and revocable.", order: 0 },
      { id: "oauth", title: "OAuth 2.0", content: "For third-party apps, use the OAuth 2.0 authorization code flow. Redirect URIs must be pre-registered.", order: 1 },
      { id: "scopes", title: "Scopes", content: "Keys and OAuth tokens are limited to the scopes granted at creation. Common scopes include sales.read, inventory.write, orders.read.", order: 2 },
    ],
  },
  {
    id: "rate-limits",
    title: "Rate Limits",
    description: "Understanding rate limits and best practices.",
    sections: [
      { id: "limits", title: "Limits", content: "Default limits are 60 requests per minute and 1,000 per hour per API key. Premium plans may request higher limits.", order: 0 },
      { id: "headers", title: "Headers", content: "Responses include X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset.", order: 1 },
      { id: "best-practices", title: "Best practices", content: "Use webhooks for event-driven updates instead of polling. Retry with exponential backoff on 429 responses.", order: 2 },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Setting up and managing webhooks.",
    sections: [
      { id: "subscribing", title: "Subscribing", content: "Register a webhook URL in the dashboard. Gevon sends a POST with a JSON payload and an X-Gevon-Signature header.", order: 0 },
      { id: "security", title: "Security", content: "Verify the HMAC-SHA256 signature using your webhook secret. Never log raw secrets.", order: 1 },
      { id: "retries", title: "Retries", content: "Failed deliveries are retried up to 5 times with exponential backoff. After max attempts, the delivery is dead-lettered.", order: 2 },
    ],
  },
  {
    id: "error-codes",
    title: "Error Codes",
    description: "Standard error responses.",
    sections: [
      { id: "format", title: "Error format", content: 'Errors return JSON: { "error": { "code": "string", "message": "string", "details": {} } }', order: 0 },
      { id: "codes", title: "Common codes", content: "400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Rate Limited, 500 Server Error.", order: 1 },
    ],
  },
  {
    id: "versioning",
    title: "Versioning",
    description: "API versioning policy.",
    sections: [
      { id: "versions", title: "Versions", content: "The current version is v1. Versions are specified in the URL path: /v1/... Breaking changes will introduce a new version.", order: 0 },
      { id: "deprecation", title: "Deprecation", content: "Deprecated versions are supported for at least 12 months. Watch the changelog for sunset dates.", order: 1 },
    ],
  },
];

export function generateDocsFromRegistry(): DocPage[] {
  return API_DOCS;
}

export const EVENT_CATALOG = [
  { id: "sale.completed", name: "Sale completed", description: "A sale was completed and inventory decremented.", payload: { companyId: "uuid", saleId: "uuid", total: 0 } },
  { id: "order.created", name: "Order created", description: "A new order was created.", payload: { companyId: "uuid", orderId: "uuid", channel: "string", total: 0 } },
  { id: "payment.received", name: "Payment received", description: "A payment was recorded.", payload: { companyId: "uuid", saleId: "uuid", amount: 0, method: "string" } },
  { id: "inventory.stock.low_detected", name: "Low stock detected", description: "Stock fell below threshold.", payload: { companyId: "uuid", productId: "uuid", currentStock: 0 } },
  { id: "customer.created", name: "Customer created", description: "A new customer was added.", payload: { companyId: "uuid", customerId: "uuid" } },
  { id: "integration.sync.completed", name: "Integration sync completed", description: "An external integration sync finished.", payload: { companyId: "uuid", integrationId: "uuid", recordsProcessed: 0 } },
];
