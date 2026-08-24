import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enqueueJob } from "@/platform/jobs/jobs.functions";
import { publishEvent } from "@/platform/events/bus.functions";
import { writeAudit } from "@/platform/audit.helpers";

export const startImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      name: z.string().min(1),
      entityType: z.string().min(1),
      format: z.enum(["csv", "excel", "json"]).default("csv"),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
      mapping: z.record(z.string(), z.string()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("data_imports")
      .insert({
        company_id: data.companyId,
        name: data.name,
        entity_type: data.entityType,
        format: data.format,
        file_url: data.fileUrl,
        file_name: data.fileName,
        mapping: data.mapping,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await publishEvent({ key: "import.started", payload: { companyId: data.companyId, importId: row.id, entityType: data.entityType, format: data.format } });
    await enqueueJob({ jobType: "integration.import", payload: { importId: row.id, companyId: data.companyId }, companyId: data.companyId, moduleId: "integrations" });
    await writeAudit(context, { companyId: data.companyId, action: "import.started", entityType: "data_import", entityId: row.id });
    return row;
  });

export const getImportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("data_imports").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("data_imports").update({ status: "cancelled" }).eq("id", data.id).select("company_id").single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: row.company_id, action: "import.cancelled", entityType: "data_import", entityId: data.id });
    return { ok: true };
  });

export const startExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      name: z.string().min(1),
      entityType: z.string().min(1),
      format: z.enum(["csv", "excel", "json"]).default("csv"),
      filters: z.record(z.string(), z.unknown()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("data_exports")
      .insert({
        company_id: data.companyId,
        name: data.name,
        entity_type: data.entityType,
        format: data.format,
        filters: data.filters,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context, { companyId: data.companyId, action: "export.started", entityType: "data_export", entityId: row.id });
    return row;
  });

export const getExportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("data_exports").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const downloadExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return { url: `/api/integrations/exports/${data.id}/download` };
  });
