import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLookups, updateCompany, listMyCompanies } from "@/lib/core.functions";
import { useActiveCompany } from "./app";
import { PageHeader } from "@/components/core/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings/")({
  component: CompanySettings,
});

function CompanySettings() {
  const active = useActiveCompany();
  const fnLookups = useServerFn(listLookups);
  const fnList = useServerFn(listMyCompanies);
  const fnUpdate = useServerFn(updateCompany);
  const { data: lookups } = useQuery({ queryKey: ["lookups"], queryFn: () => fnLookups({}) });
  const { data: mine, refetch } = useQuery({ queryKey: ["companies", "mine"], queryFn: () => fnList({}) });

  const company = mine?.companies.find((c) => c.id === active.id);
  const [form, setForm] = useState({ name: "", countryCode: "", currencyCode: "", timezone: "", locale: "", fiscalYearStartMonth: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm({
      name: company.name,
      countryCode: company.country_code,
      currencyCode: company.currency_code,
      timezone: company.timezone,
      locale: company.locale,
      fiscalYearStartMonth: (company as any).fiscal_year_start_month ?? 1,
    });
  }, [company]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader eyebrow="Settings" title="Company" description="Core details for your workspace. Members with the company.write permission can update these." />
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await fnUpdate({ data: { companyId: active.id, ...form } });
            toast.success("Saved");
            refetch();
          } catch (err: any) {
            toast.error(err.message ?? "Update failed");
          } finally { setSaving(false); }
        }}
      >
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={form.countryCode} onValueChange={(v) => setForm({ ...form, countryCode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(lookups?.countries ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.currencyCode} onValueChange={(v) => setForm({ ...form, currencyCode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(lookups?.currencies ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(lookups?.timezones ?? []).map((c: any) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(lookups?.locales ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Fiscal year starts (month)</Label>
          <Select value={String(form.fiscalYearStartMonth)} onValueChange={(v) => setForm({ ...form, fiscalYearStartMonth: Number(v) })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
