import { z } from "zod";

export async function parseCSV(file: File | Buffer): Promise<any[]> {
  const text = file instanceof File ? await file.text() : file.toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? null; });
    return row;
  });
}

export async function parseJSON(file: File | Buffer): Promise<any[]> {
  const text = file instanceof File ? await file.text() : file.toString("utf8");
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function generateCSV(rows: any[], columns: { key: string; label: string }[]): Promise<Blob> {
  const header = columns.map((c) => c.label).join(",");
  const body = rows.map((row) => columns.map((c) => JSON.stringify(row[c.key] ?? "")).join(",")).join("\n");
  return new Blob([header + "\n" + body], { type: "text/csv" });
}

export async function generateJSON(rows: any[]): Promise<Blob> {
  return new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
}

export function validateImportRow(row: any, schema: z.ZodSchema<any>): { valid: boolean; errors: string[] } {
  const result = schema.safeParse(row);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) };
}

export function mapImportColumns(mapping: Record<string, string>, row: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [source, target] of Object.entries(mapping)) {
    if (source in row) mapped[target] = row[source];
  }
  return mapped;
}
