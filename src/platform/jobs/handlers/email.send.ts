/**
 * email.send job handler.
 *
 * Delivers via Lovable Emails when the scaffold + verified domain are
 * present; otherwise marks the communication log as `queued` for later
 * retry. This keeps the bus fully decoupled from provider availability.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function handleEmailSend(
  admin: SupabaseClient,
  payload: Record<string, any>,
): Promise<{ delivered: boolean; providerMessageId?: string; reason?: string }> {
  const { templateKey, to, subject } = payload as {
    templateKey: string; to: string; subject?: string | null;
  };

  // Locate the matching communication_log row (most recent queued match).
  const { data: logRow } = await (admin as any)
    .from("communication_logs")
    .select("id")
    .eq("recipient_address", to)
    .eq("template_key", templateKey)
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stampLog = async (patch: Record<string, unknown>) => {
    if (!logRow?.id) return;
    await (admin as any).from("communication_logs").update(patch).eq("id", logRow.id);
  };

  // Try Lovable Emails scaffold (present iff domain configured).
  try {
    // Dynamic import so missing scaffold does not break the build.
    const mod: any = await import("@/lib/email-templates/send-email").catch(() => null);

    if (mod && typeof mod.sendTemplateEmail === "function") {
      const result = await mod.sendTemplateEmail(templateKey, to, {
        templateData: payload.templateData ?? {},
      });
      if (result?.sent) {
        await stampLog({ status: "sent", sent_at: new Date().toISOString() });
        return { delivered: true };
      }
      if (result?.reason === "recipient_suppressed") {
        await stampLog({ status: "suppressed", error: "recipient_suppressed" });
        return { delivered: false, reason: "recipient_suppressed" };
      }
      await stampLog({ status: "failed", error: result?.reason ?? "unknown" });
      return { delivered: false, reason: result?.reason };
    }
  } catch (e: any) {
    await stampLog({ status: "failed", error: e?.message ?? String(e) });
    throw e;
  }

  // Provider not configured — leave as queued (dashboard shows this state).
  await stampLog({ status: "queued", error: "email provider not configured" });
  return { delivered: false, reason: "email_provider_not_configured" };
}
