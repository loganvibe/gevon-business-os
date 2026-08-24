export interface PosSaleItem {
  id?: string;
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tax?: number;
  discount?: number;
  metadata?: Record<string, unknown>;
}

export interface PosSale {
  id: string;
  externalId: string;
  storeId: string;
  storeName: string;
  customerId?: string;
  customerName?: string;
  items: PosSaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PosRefund {
  id: string;
  externalId: string;
  saleId: string;
  amount: number;
  reason?: string;
  createdAt: string;
}

export interface PosCustomer {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface PosProduct {
  id: string;
  externalId: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface PosStockUpdate {
  productId: string;
  externalId: string;
  quantity: number;
  type: "in" | "out" | "adjust";
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PosPayment {
  id: string;
  externalId: string;
  saleId: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  createdAt: string;
}

export interface PosStore {
  id: string;
  externalId: string;
  name: string;
  address?: string;
  metadata?: Record<string, unknown>;
}

export interface PosAdapter {
  normalizeSale(sale: any): Promise<PosSale>;
  normalizeRefund(refund: any): Promise<PosRefund>;
  normalizeCustomer(customer: any): Promise<PosCustomer>;
  normalizeProduct(product: any): Promise<PosProduct>;
  normalizeStockUpdate(update: any): Promise<PosStockUpdate>;
  normalizePayment(payment: any): Promise<PosPayment>;
}

const adapters = new Map<string, PosAdapter>();

export function registerPosAdapter(id: string, adapter: PosAdapter): void {
  adapters.set(id, adapter);
}

export function getPosAdapter(id: string): PosAdapter | undefined {
  return adapters.get(id);
}

export function allPosAdapters(): string[] {
  return Array.from(adapters.keys());
}

export const genericPosAdapter: PosAdapter = {
  async normalizeSale(sale: any) {
    return {
      id: sale.id ?? crypto.randomUUID(),
      externalId: sale.externalId ?? sale.id,
      storeId: sale.storeId ?? sale.store?.id,
      storeName: sale.storeName ?? sale.store?.name ?? "Default Store",
      customerId: sale.customerId ?? sale.customer?.id,
      customerName: sale.customerName ?? sale.customer?.name,
      items: (sale.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId ?? item.product?.id,
        sku: item.sku ?? item.product?.sku,
        name: item.name ?? item.product?.name,
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unitPrice ?? item.price ?? 0),
        total: Number(item.total ?? item.quantity * (item.unitPrice ?? item.price ?? 0)),
        tax: item.tax ? Number(item.tax) : undefined,
        discount: item.discount ? Number(item.discount) : undefined,
        metadata: item.metadata,
      })),
      subtotal: Number(sale.subtotal ?? 0),
      tax: Number(sale.tax ?? 0),
      discount: Number(sale.discount ?? 0),
      total: Number(sale.total ?? 0),
      paymentMethod: sale.paymentMethod ?? sale.payments?.[0]?.method ?? "cash",
      paymentStatus: sale.paymentStatus ?? "paid",
      createdAt: sale.createdAt ?? new Date().toISOString(),
      metadata: sale.metadata,
    };
  },
  async normalizeRefund(refund: any) {
    return {
      id: refund.id ?? crypto.randomUUID(),
      externalId: refund.externalId ?? refund.id,
      saleId: refund.saleId,
      amount: Number(refund.amount ?? 0),
      reason: refund.reason,
      createdAt: refund.createdAt ?? new Date().toISOString(),
    };
  },
  async normalizeCustomer(customer: any) {
    return {
      id: customer.id ?? crypto.randomUUID(),
      externalId: customer.externalId ?? customer.id,
      firstName: customer.firstName ?? customer.name?.split(" ")[0] ?? "",
      lastName: customer.lastName ?? customer.name?.split(" ").slice(1).join(" ") ?? "",
      email: customer.email,
      phone: customer.phone,
      metadata: customer.metadata,
    };
  },
  async normalizeProduct(product: any) {
    return {
      id: product.id ?? crypto.randomUUID(),
      externalId: product.externalId ?? product.id,
      sku: product.sku ?? product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price ?? 0),
      cost: product.cost ? Number(product.cost) : undefined,
      category: product.category,
      metadata: product.metadata,
    };
  },
  async normalizeStockUpdate(update: any) {
    return {
      productId: update.productId,
      externalId: update.externalId ?? update.productId,
      quantity: Number(update.quantity ?? 0),
      type: update.type ?? "adjust",
      reason: update.reason,
      metadata: update.metadata,
    };
  },
  async normalizePayment(payment: any) {
    return {
      id: payment.id ?? crypto.randomUUID(),
      externalId: payment.externalId ?? payment.id,
      saleId: payment.saleId,
      amount: Number(payment.amount ?? 0),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      createdAt: payment.createdAt ?? new Date().toISOString(),
    };
  },
};

registerPosAdapter("generic_pos", genericPosAdapter);
