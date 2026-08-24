export interface SyncParams {
  companyId: string;
  integrationId: string;
  companyIntegrationId?: string;
  since?: string;
  filters?: Record<string, unknown>;
}

export interface PushParams extends SyncParams {
  records: any[];
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

export interface SyncAdapter {
  id: string;
  name: string;
  fullSync(params: SyncParams): Promise<SyncResult>;
  incrementalSync(params: SyncParams): Promise<SyncResult>;
  push(params: PushParams): Promise<SyncResult>;
}

const adapters = new Map<string, SyncAdapter>();

export function registerSyncAdapter(adapter: SyncAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getSyncAdapter(id: string): SyncAdapter | undefined {
  return adapters.get(id);
}

export async function createExternalIdMapping(companyId: string, integrationId: string, externalId: string, gevonId: string, entityType: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any).from("integration_syncs").insert({
    company_id: companyId,
    integration_id: integrationId,
    sync_type: "idempotency",
    direction: "pull",
    status: "completed",
    metadata: { external_id: externalId, gevon_id: gevonId, entity_type: entityType },
  });
}

export async function resolveExternalId(companyId: string, integrationId: string, externalId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any).from("integration_syncs").select("metadata").eq("company_id", companyId).eq("integration_id", integrationId).eq("metadata->>external_id", externalId).maybeSingle();
  return data?.metadata?.gevon_id ?? null;
}

export async function resolveGevonId(companyId: string, integrationId: string, gevonId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any).from("integration_syncs").select("metadata").eq("company_id", companyId).eq("integration_id", integrationId).eq("metadata->>gevon_id", gevonId).maybeSingle();
  return data?.metadata?.external_id ?? null;
}
