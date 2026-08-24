import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/platform/events/bus.functions";

export async function handleDataImport(admin: SupabaseClient, payload: Record<string, any>, _jobId: string): Promise<Record<string, any>> {
  const importId = payload.importId as string;

  const { data: importRecord } = await admin.from("data_imports").select("*").eq("id", importId).single();
  if (!importRecord) throw new Error("Import not found");

  await admin.from("data_imports").update({ status: "processing", started_at: new Date().toISOString() }).eq("id", importId);

  await new Promise((r) => setTimeout(r, 600));

  const successCount = Math.floor(Math.random() * 20) + 1;
  const errorCount = Math.floor(Math.random() * 3);
  const success = errorCount === 0;

  await admin.from("data_imports").update({
    status: success ? "completed" : "failed",
    completed_at: new Date().toISOString(),
    processed_rows: successCount + errorCount,
    success_count: successCount,
    error_count: errorCount,
    errors: success ? [] : [{ row: 1, message: "Simulated validation error" }],
  }).eq("id", importId);

  await publishEvent({
    key: success ? "import.completed" : "import.failed",
    payload: {
      companyId: importRecord.company_id,
      importId,
      entityType: importRecord.entity_type,
      successCount,
      errorCount,
      error: success ? undefined : "Simulated validation error",
    },
  });

  return { success, successCount, errorCount };
}
