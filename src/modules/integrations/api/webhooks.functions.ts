import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hashSecret, generateWebhookSecret } from "@/platform/integrations/crypto";
import { signWebhookPayload } from "@/platform/integrations/webhooks/outbound";
import { writeAudit } from "@/platform/audit.helpers";

export const listWebhooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("webhooks")
      .select("id, company_id, name, description, url, status, events, timeout_seconds, is_enabled, last_delivered_at, last_error, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      name: z.string().min(1),
      url: z.string().url(),
      events: z.array(z.string()).default([]),
      headers: z.record(z.string(), z.unknown()).default({}),
      timeoutSeconds: z.number().int().min(5).max(120).default(30),
      retryPolicy: z.record(z.string(), z.unknown()).default({ max_attempts: 5, backoff: "exponential" }),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const secret = generateWebhookSecret();
    const { data: row, error } = await supabase
      .from("webhooks")
      .insert({
        company_id: data.companyId,
        name: data.name,
        url: data.url,
        secret,
        secret_hash: hashSecret(secret),
        events: data.events,
        headers: data.headers,
        timeout_seconds: data.timeoutSeconds,
        retry_policy: data.retryPolicy,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "webhook.created", entityType: "webhook", entityId: row.id, after: { name: data.name, url: data.url } });
    return { id: row.id, secret, events: data.events };
  });

export const updateWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      url: z.string().url().optional(),
      events: z.array(z.string()).optional(),
      headers: z.record(z.string(), z.unknown()).optional(),
      timeoutSeconds: z.number().int().min(5).max(120).optional(),
      retryPolicy: z.record(z.string(), z.unknown()).optional(),
      isEnabled: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.url) updates.url = data.url;
    if (data.events) updates.events = data.events;
    if (data.headers) updates.headers = data.headers;
    if (data.timeoutSeconds) updates.timeout_seconds = data.timeoutSeconds;
    if (data.retryPolicy) updates.retry_policy = data.retryPolicy;
    if (data.isEnabled !== undefined) updates.is_enabled = data.isEnabled;
    const { data: row, error } = await supabase.from("webhooks").update(updates).eq("id", data.id).select("company_id, name").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id, action: "webhook.updated", entityType: "webhook", entityId: data.id });
    return { ok: true };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("webhooks").select("company_id, name").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { error: delErr } = await supabase.from("webhooks").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    await writeAudit(context, { companyId: row.company_id, action: "webhook.deleted", entityType: "webhook", entityId: data.id, after: { name: row.name } });
    return { ok: true };
  });

export const listWebhookDeliveries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ webhookId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .eq("webhook_id", data.webhookId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const replayWebhookDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ deliveryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: delivery, error } = await supabase.from("webhook_deliveries").select("*").eq("id", data.deliveryId).single();
    if (error) throw new Error(error.message);
    const { data: webhook, error: whErr } = await supabase.from("webhooks").select("*").eq("id", delivery.webhook_id).single();
    if (whErr) throw new Error(whErr.message);
    await supabase.from("webhook_deliveries").insert({
      company_id: delivery.company_id,
      webhook_id: delivery.webhook_id,
      event_key: delivery.event_key,
      status: "pending",
      request_body: delivery.request_body,
      attempts: 0,
      max_attempts: webhook.retry_policy?.max_attempts ?? 5,
    });
    await writeAudit(context, { companyId: delivery.company_id, action: "webhook.replay", entityType: "webhook", entityId: delivery.webhook_id });
    return { ok: true };
  });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: webhook } = await supabase.from("webhooks").select("*").eq("id", data.id).single();
    if (!webhook) throw new Error("Webhook not found");
    const testPayload = { event: "test", data: { message: "Test delivery from Gevon" }, timestamp: new Date().toISOString() };
    const signature = signWebhookPayload(testPayload, webhook.secret);
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Gevon-Event": "test", "X-Gevon-Signature": signature, "X-Gevon-Delivery": crypto.randomUUID() },
        body: JSON.stringify(testPayload),
      });
      return { success: res.ok, status: res.status, body: await res.text() };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
