/**
 * notification.digest — placeholder for scheduled digest emails.
 * Real digest scheduling is deferred to a future milestone; the handler
 * exists so the job type can be enqueued today without runner errors.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function handleNotificationDigest(
  _admin: SupabaseClient,
  _payload: Record<string, any>,
): Promise<{ skipped: true }> {
  return { skipped: true };
}
