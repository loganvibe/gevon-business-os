/**
 * Email Service — centralized wrapper.
 *
 * The ONLY entry point for module code to send email. It enqueues an
 * `email.send` job (or writes directly to communication_logs) so retry,
 * suppression, and provider handling all live in the runner.
 *
 * When Lovable Emails is configured (see docs), the runner delivers via
 * `sendTemplateEmail`. Otherwise the send is logged as `queued` and can be
 * retried when the provider is set up.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/platform/audit.helpers";

export const sendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    templateKey: string;
    to: string;
    templateData?: Record<string, unknown>;
    subject?: string;
    companyId?: string | null;
    moduleId?: string;
    category?: "system" | "business" | "security" | "ai" | "billing" | "modules";
    idempotencyKey?: string;
  }) =>
    z.object({
      templateKey: z.string().min(1),
      to: z.string().email(),
      templateData: z.record(z.string(), z.unknown()).default({}),
      subject: z.string().optional(),
      companyId: z.string().uuid().nullable().optional(),
      moduleId: z.string().default("core"),
      category: z
        .enum(["system", "business", "security", "ai", "billing", "modules"])
        .default("system"),
      idempotencyKey: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job, error: jobErr } = await (supabaseAdmin as any)
      .from("jobs")
      .insert({
        company_id: data.companyId ?? null,
        module_id: data.moduleId,
        job_type: "email.send",
        payload: {
          templateKey: data.templateKey,
          to: data.to,
          subject: data.subject ?? null,
          templateData: data.templateData,
          category: data.category,
          idempotencyKey: data.idempotencyKey ?? null,
        },
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (jobErr) throw new Error(jobErr.message);

    await (supabaseAdmin as any).from("communication_logs").insert({
      company_id: data.companyId ?? null,
      module_id: data.moduleId,
      channel: "email",
      recipient_address: data.to,
      status: "queued",
      template_key: data.templateKey,
      subject: data.subject ?? null,
    });

    await writeAudit(context, {
      companyId: data.companyId ?? null,
      action: "email.enqueue",
      entityType: "platform.jobs",
      entityId: job.id,
      after: { templateKey: data.templateKey, to: data.to },
    });

    return { jobId: job.id as string };
  });
