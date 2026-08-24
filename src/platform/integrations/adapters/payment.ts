export interface PaymentInitParams {
  amount: number;
  currency: string;
  reference: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  reference: string;
  status: string;
  authorizationUrl?: string;
  accessCode?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerification {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string;
  metadata?: Record<string, unknown>;
}

export interface RefundParams {
  reference: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundResult {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  refundedAt: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentAdapter {
  initiatePayment(params: PaymentInitParams): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<PaymentVerification>;
  processRefund(params: RefundParams): Promise<RefundResult>;
}

const adapters = new Map<string, PaymentAdapter>();

export function registerPaymentAdapter(id: string, adapter: PaymentAdapter): void {
  adapters.set(id, adapter);
}

export function getPaymentAdapter(id: string): PaymentAdapter | undefined {
  return adapters.get(id);
}

export function allPaymentAdapters(): string[] {
  return Array.from(adapters.keys());
}

export const genericPaymentAdapter: PaymentAdapter = {
  async initiatePayment(params: PaymentInitParams) {
    return {
      reference: params.reference,
      status: "pending",
      metadata: params.metadata,
    };
  },
  async verifyPayment(reference: string) {
    return {
      reference,
      status: "unknown",
      amount: 0,
      currency: "NGN",
      paidAt: new Date().toISOString(),
    };
  },
  async processRefund(params: RefundParams) {
    return {
      reference: params.reference,
      status: "pending",
      amount: params.amount,
      currency: "NGN",
      refundedAt: new Date().toISOString(),
    };
  },
};

registerPaymentAdapter("generic_payment", genericPaymentAdapter);
