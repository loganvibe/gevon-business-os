/**
 * Shared audit-log writer. Used across server functions.
 * Loads `supabaseAdmin` inside the handler (never at module scope of a
 * `.functions.ts` file) so the server-only bundle never reaches the client.
 */
export async function writeAudit(
  context: { userId: string },
  entry: {
    companyId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).schema("audit").from("audit_logs").insert({
      company_id: entry.companyId,
      actor_user_id: context.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
