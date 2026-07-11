/**
 * Notification Center — user-facing server functions.
 * The dispatcher writes notifications directly; these functions are for the
 * inbox UI and preferences.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: "unread" | "read" | "archived" | "all"; limit?: number }) =>
    z.object({
      status: z.enum(["unread", "read", "archived", "all"]).default("unread"),
      limit: z.number().int().min(1).max(100).default(50),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .select("id, category, priority, title, message, deep_link, status, created_at, read_at")
      .eq("recipient_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const unreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", context.userId)
      .eq("status", "unread");
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("recipient_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("recipient_user_id", context.userId)
      .eq("status", "unread");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("recipient_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Preferences ----------------

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { prefs: data ?? [] };
  });

export const setPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    channel: "email" | "in_app" | "sms" | "whatsapp";
    category: "system" | "business" | "security" | "ai" | "billing" | "modules";
    enabled: boolean;
    companyId?: string | null;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    digestFrequency?: "none" | "daily" | "weekly";
  }) =>
    z.object({
      channel: z.enum(["email", "in_app", "sms", "whatsapp"]),
      category: z.enum(["system", "business", "security", "ai", "billing", "modules"]),
      enabled: z.boolean(),
      companyId: z.string().uuid().nullable().optional(),
      quietHoursStart: z.string().nullable().optional(),
      quietHoursEnd: z.string().nullable().optional(),
      digestFrequency: z.enum(["none", "daily", "weekly"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      company_id: data.companyId ?? null,
      channel: data.channel,
      category: data.category,
      enabled: data.enabled,
      quiet_hours_start: data.quietHoursStart ?? null,
      quiet_hours_end: data.quietHoursEnd ?? null,
      digest_frequency: data.digestFrequency ?? "none",
    };
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert(row, { onConflict: "user_id,company_id,channel,category" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
