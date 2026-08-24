import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/platform/events/bus.functions";

export async function handleIntegrationSync(admin: SupabaseClient, payload: Record<string, any>, _jobId: string): Promise<Record<string, any>> {
  const companyId = payload.companyId as string;
  const integrationId = payload.integrationId as string;
  const companyIntegrationId = payload.companyIntegrationId as string | undefined;
  const syncType = payload.syncType as string || "incremental_sync";

  await admin.from("integration_syncs").insert({
    company_id: companyId,
    integration_id: integrationId,
    company_integration_id: companyIntegrationId,
    sync_type: syncType,
    direction: "pull",
    status: "running",
    started_at: new Date().toISOString(),
  });

  await new Promise((r) => setTimeout(r, 500));

  const recordsProcessed = Math.floor(Math.random() * 50) + 1;
  const recordsCreated = Math.floor(Math.random() * 10);
  const recordsUpdated = recordsProcessed - recordsCreated;
  const success = Math.random() > 0.1;

  const syncStatus = success ? "completed" : "failed";

  await admin.from("integration_syncs").update({
    status: syncStatus,
    completed_at: new Date().toISOString(),
    records_processed: recordsProcessed,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    records_failed: success ? 0 : Math.floor(Math.random() * 5),
    error_message: success ? null : "Simulated sync error for demonstration",
  }).eq("company_id", companyId).eq("integration_id", integrationId).eq("status", "running").order("created_at", { ascending: false }).limit(1);

  await publishEvent({
    key: success ? "integration.sync.completed" : "integration.sync.failed",
    payload: {
      companyId,
      integrationId,
      syncId: crypto.randomUUID(),
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      error: success ? undefined : "Simulated sync error for demonstration",
    },
  });

  return { success, recordsProcessed, recordsCreated, recordsUpdated };
}
