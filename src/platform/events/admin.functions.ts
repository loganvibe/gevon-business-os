/**
 * Platform-admin server functions for the event registry.
 * Syncs the in-code registry into `public.platform_events`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requirePlatformAdmin } from "@/integrations/platform/admin-middleware";
import { allEvents, serializeEvent } from "./registry";
import { writeAudit } from "@/platform/audit.helpers";

export const syncEventRegistry = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = allEvents().map(serializeEvent);
    const { error } = await (supabaseAdmin as any)
      .from("platform_events")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      companyId: null,
      action: "platform.events.sync",
      entityType: "platform.platform_events",
      after: { count: rows.length },
    });
    return { synced: rows.length };
  });
