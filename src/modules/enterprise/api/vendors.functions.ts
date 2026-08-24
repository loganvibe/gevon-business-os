import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["active", "inactive", "blacklisted"]).optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listVendors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("vendors")
      .select("id, name, code, vendor_type, status, email, phone, city, country_code, payment_terms, currency_code, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,code.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const getVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select("*, vendor_contacts(*), vendor_documents(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vendor) throw new Error("Vendor not found");
    return vendor;
  });

const createInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  code: z.string().max(50).optional(),
  vendorType: z.string().max(50).default("supplier"),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  countryCode: z.string().max(10).optional(),
  taxId: z.string().max(50).optional(),
  paymentTerms: z.string().max(100).optional(),
  currencyCode: z.string().length(3).default("NGN"),
});

export const createVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vendors")
      .insert({
        company_id: data.companyId,
        name: data.name,
        code: data.code ?? null,
        vendor_type: data.vendorType,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        country_code: data.countryCode ?? null,
        tax_id: data.taxId ?? null,
        payment_terms: data.paymentTerms ?? null,
        currency_code: data.currencyCode,
        created_by: context.userId,
      })
      .select("id, name, code")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateInput = createInput.partial().extend({ id: z.string().uuid(), companyId: z.string().uuid() });

export const updateVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.code !== undefined) patch["code"] = data.code;
    if (data.vendorType !== undefined) patch["vendor_type"] = data.vendorType;
    if (data.email !== undefined) patch["email"] = data.email;
    if (data.phone !== undefined) patch["phone"] = data.phone;
    if (data.website !== undefined) patch["website"] = data.website;
    if (data.address !== undefined) patch["address"] = data.address;
    if (data.city !== undefined) patch["city"] = data.city;
    if (data.state !== undefined) patch["state"] = data.state;
    if (data.countryCode !== undefined) patch["country_code"] = data.countryCode;
    if (data.taxId !== undefined) patch["tax_id"] = data.taxId;
    if (data.paymentTerms !== undefined) patch["payment_terms"] = data.paymentTerms;
    if (data.currencyCode !== undefined) patch["currency_code"] = data.currencyCode;

    const { error } = await context.supabase
      .from("vendors")
      .update(patch as never)
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vendors")
      .update({ status: "blacklisted" })
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
