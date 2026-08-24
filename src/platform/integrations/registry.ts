export interface ProviderConfig {
  id: string;
  name: string;
  provider: string;
  category: string;
  adapterClass?: string;
  requiredPermissions: string[];
  supportedCapabilities: string[];
  configRequirements: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

const providers = new Map<string, ProviderConfig>();

export function registerProvider(config: ProviderConfig): void {
  providers.set(config.id, config);
}

export function getProvider(id: string): ProviderConfig | undefined {
  return providers.get(id);
}

export function allProviders(): ProviderConfig[] {
  return Array.from(providers.values());
}

registerProvider({
  id: "generic_pos",
  name: "Generic POS",
  provider: "gevon",
  category: "pos",
  requiredPermissions: ["sales.read", "inventory.read"],
  supportedCapabilities: ["sale", "refund", "customer", "product", "stock_update"],
  configRequirements: { apiEndpoint: { type: "text", required: true }, apiKey: { type: "secret", required: true } },
});

registerProvider({
  id: "generic_payment",
  name: "Generic Payment Provider",
  provider: "gevon",
  category: "payments",
  requiredPermissions: ["sales.write"],
  supportedCapabilities: ["payment_initiated", "payment_successful", "payment_failed", "refund"],
  configRequirements: { apiEndpoint: { type: "text", required: true }, secretKey: { type: "secret", required: true } },
});

registerProvider({
  id: "shopify",
  name: "Shopify",
  provider: "shopify",
  category: "e_commerce",
  requiredPermissions: ["orders.read", "products.read", "customers.read"],
  supportedCapabilities: ["order", "product", "customer", "inventory"],
  configRequirements: { shopDomain: { type: "text", required: true }, accessToken: { type: "secret", required: true } },
});

registerProvider({
  id: "woocommerce",
  name: "WooCommerce",
  provider: "woocommerce",
  category: "e_commerce",
  requiredPermissions: ["orders.read", "products.read"],
  supportedCapabilities: ["order", "product", "customer"],
  configRequirements: { storeUrl: { type: "text", required: true }, consumerKey: { type: "secret", required: true }, consumerSecret: { type: "secret", required: true } },
});

registerProvider({
  id: "paystack",
  name: "Paystack",
  provider: "paystack",
  category: "payments",
  requiredPermissions: ["sales.write"],
  supportedCapabilities: ["payment_initiated", "payment_successful", "payment_failed", "refund"],
  configRequirements: { publicKey: { type: "text", required: true }, secretKey: { type: "secret", required: true } },
});

registerProvider({
  id: "flutterwave",
  name: "Flutterwave",
  provider: "flutterwave",
  category: "payments",
  requiredPermissions: ["sales.write"],
  supportedCapabilities: ["payment_initiated", "payment_successful", "payment_failed", "refund"],
  configRequirements: { publicKey: { type: "text", required: true }, secretKey: { type: "secret", required: true }, encryptionKey: { type: "secret", required: true } },
});

registerProvider({
  id: "quickbooks",
  name: "QuickBooks",
  provider: "quickbooks",
  category: "accounting",
  requiredPermissions: ["finance.read", "finance.write"],
  supportedCapabilities: ["invoice", "payment", "customer", "vendor"],
  configRequirements: { clientId: { type: "text", required: true }, clientSecret: { type: "secret", required: true }, realmId: { type: "text", required: true } },
});

registerProvider({
  id: "xero",
  name: "Xero",
  provider: "xero",
  category: "accounting",
  requiredPermissions: ["finance.read", "finance.write"],
  supportedCapabilities: ["invoice", "payment", "customer", "vendor"],
  configRequirements: { clientId: { type: "text", required: true }, clientSecret: { type: "secret", required: true } },
});

registerProvider({
  id: "whatsapp",
  name: "WhatsApp Business",
  provider: "whatsapp",
  category: "communication",
  requiredPermissions: ["communication.send"],
  supportedCapabilities: ["message", "template"],
  configRequirements: { phoneNumberId: { type: "text", required: true }, accessToken: { type: "secret", required: true }, businessAccountId: { type: "text", required: true } },
});

registerProvider({
  id: "telegram",
  name: "Telegram Bot",
  provider: "telegram",
  category: "communication",
  requiredPermissions: ["communication.send"],
  supportedCapabilities: ["message"],
  configRequirements: { botToken: { type: "secret", required: true } },
});
