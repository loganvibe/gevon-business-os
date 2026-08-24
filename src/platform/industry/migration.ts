import { z } from "zod";
import { parseCSV, parseJSON, validateImportRow, mapImportColumns } from "@/platform/integrations/import-export";

export const productImportSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().optional(),
});

export const customerImportSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export const supplierImportSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const employeeImportSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

export const importSchemas: Record<string, z.ZodSchema<any>> = {
  products: productImportSchema,
  customers: customerImportSchema,
  suppliers: supplierImportSchema,
  employees: employeeImportSchema,
};

export async function validateImportFile(file: File | Buffer, entityType: string, mapping: Record<string, string>) {
  const parser = file.name?.endsWith(".json") ? parseJSON : parseCSV;
  const rows = await parser(file);
  const schema = importSchemas[entityType];
  if (!schema) throw new Error(`Unknown entity type: ${entityType}`);
  const results = rows.map((row, idx) => {
    const mapped = mapImportColumns(mapping, row);
    const validation = validateImportRow(mapped, schema);
    return { rowNumber: idx + 1, data: mapped, valid: validation.valid, errors: validation.errors };
  });
  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);
  return { total: results.length, valid: valid.length, invalid: invalid.length, results };
}
