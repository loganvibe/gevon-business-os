/**
 * Integrations & Developer Platform — types.
 */
export enum IntegrationCategory {
  Payments = "payments",
  POS = "pos",
  Accounting = "accounting",
  Communication = "communication",
  Ecommerce = "e_commerce",
  Logistics = "logistics",
  Storage = "storage",
  Analytics = "analytics",
  Other = "other",
}

export enum IntegrationStatus {
  Draft = "draft",
  Active = "active",
  Paused = "paused",
  Error = "error",
  Deprecated = "deprecated",
}

export enum ApiKeyStatus {
  Active = "active",
  Revoked = "revoked",
  Expired = "expired",
}

export enum WebhookStatus {
  Active = "active",
  Paused = "paused",
  Error = "error",
}

export enum DeliveryStatus {
  Pending = "pending",
  Delivered = "delivered",
  Failed = "failed",
  Retrying = "retrying",
}

export enum OAuthStatus {
  Connected = "connected",
  Disconnected = "disconnected",
  Error = "error",
  Expired = "expired",
}

export enum SyncStatus {
  Idle = "idle",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Partial = "partial",
}

export enum SyncDirection {
  Push = "push",
  Pull = "pull",
  TwoWay = "two_way",
}

export enum ImportStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum ExportFormat {
  CSV = "csv",
  Excel = "excel",
  JSON = "json",
}

export interface IntegrationRegistry {
  id: string;
  name: string;
  provider: string;
  category: IntegrationCategory;
  description?: string;
  logoUrl?: string;
  status: IntegrationStatus;
  requiredPermissions: string[];
  supportedCapabilities: string[];
  configRequirements: Record<string, unknown>;
  adapterClass?: string;
  isBuiltIn: boolean;
  version: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyIntegration {
  id: string;
  companyId: string;
  integrationId: string;
  name: string;
  status: IntegrationStatus;
  configuration: Record<string, unknown>;
  credentialsEncrypted: Record<string, unknown>;
  settings: Record<string, unknown>;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  lastError?: string;
  isEnabled: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  keyPrefix: string;
  keyHash: string;
  status: ApiKeyStatus;
  expiresAt?: string;
  lastUsedAt?: string;
  createdBy?: string;
  createdAt: string;
  revokedAt?: string;
  revokedBy?: string;
  metadata: Record<string, unknown>;
}

export interface ApiKeyScope {
  id: string;
  apiKeyId: string;
  scope: string;
  createdAt: string;
}

export interface ApiRateLimit {
  id: string;
  companyId: string;
  apiKeyId?: string;
  scope?: string;
  limitPerMinute: number;
  limitPerHour: number;
  currentMinute: number;
  currentHour: number;
  windowStartedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  url: string;
  secret: string;
  secretHash: string;
  status: WebhookStatus;
  events: string[];
  headers: Record<string, unknown>;
  retryPolicy: Record<string, unknown>;
  timeoutSeconds: number;
  isEnabled: boolean;
  lastDeliveredAt?: string;
  lastError?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  companyId: string;
  webhookId: string;
  eventKey: string;
  status: DeliveryStatus;
  requestHeaders: Record<string, unknown>;
  requestBody: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  responseHeaders: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InboundWebhook {
  id: string;
  companyId: string;
  integrationId?: string;
  name: string;
  path: string;
  secret: string;
  secretHash: string;
  provider?: string;
  eventTypes: string[];
  isEnabled: boolean;
  headers: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthConnection {
  id: string;
  companyId: string;
  integrationId: string;
  provider: string;
  status: OAuthStatus;
  scopes: string[];
  externalUserId?: string;
  externalUserEmail?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastRefreshedAt?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthToken {
  id: string;
  connectionId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  expiresAt?: string;
  tokenType: string;
  scope?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationJob {
  id: string;
  companyId: string;
  integrationId?: string;
  companyIntegrationId?: string;
  jobType: string;
  status: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSync {
  id: string;
  companyId: string;
  integrationId: string;
  companyIntegrationId?: string;
  syncType: string;
  direction: SyncDirection;
  status: SyncStatus;
  startedAt?: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ImportFormat = "csv" | "excel" | "json";

export interface DataImport {
  id: string;
  companyId: string;
  name: string;
  entityType: string;
  format: ImportFormat;
  status: ImportStatus;
  totalRows?: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: Record<string, unknown>[];
  mapping: Record<string, unknown>;
  fileUrl?: string;
  fileName?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataExport {
  id: string;
  companyId: string;
  name: string;
  entityType: string;
  format: ExportFormat;
  status: ImportStatus;
  totalRows?: number;
  filters: Record<string, unknown>;
  fileUrl?: string;
  fileName?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DeveloperApp {
  id: string;
  companyId?: string;
  userId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperAppKey {
  id: string;
  appId: string;
  keyPrefix: string;
  keyHash: string;
  secretHash: string;
  status: ApiKeyStatus;
  lastUsedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
}

export interface IntegrationLog {
  id: string;
  companyId?: string;
  integrationId?: string;
  companyIntegrationId?: string;
  level: string;
  category: string;
  action: string;
  message?: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

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

export interface PaymentInitiated {
  reference: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentSuccessful {
  reference: string;
  amount: number;
  currency: string;
  method: string;
  paidAt: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentFailed {
  reference: string;
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface RefundData {
  reference: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionReference {
  reference: string;
  providerReference?: string;
  status: string;
}

export interface SyncConfig {
  companyId: string;
  integrationId: string;
  companyIntegrationId?: string;
  direction: SyncDirection;
  entityTypes: string[];
  schedule?: string;
  filters?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalIdMapping {
  companyId: string;
  integrationId: string;
  externalId: string;
  gevonId: string;
  entityType: string;
  createdAt: string;
}

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
  transform?: string;
}

export interface ImportRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: string[];
}

export interface ExportConfig {
  entityType: string;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  columns?: string[];
}

export interface WebhookEvent {
  key: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookHeaders {
  "X-Gevon-Signature"?: string;
  "X-Gevon-Timestamp"?: string;
  "X-Gevon-Event"?: string;
  "X-Gevon-Delivery"?: string;
  [key: string]: string | undefined;
}
