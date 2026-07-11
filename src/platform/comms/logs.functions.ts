/**
 * Communication Logs — read-only server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCommunicationLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    companyId?: string | null;
    channel?: "email" | "in_app" | "sms" | "whatsapp";
    status?: string;
    limit?: number;
  }) =>
    z.object({
      companyId: z.string().uuid().nullable().optional(),
      channel: z.enum(["email", "in_app", "sms", "whatsapp"]).optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("communication_logs")
      .select("id, channel, status, template_key, subject, recipient_address, recipient_user_id, error, created_at, sent_at, company_id, module_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    if (data.channel) q = q.eq("channel", data.channel);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
