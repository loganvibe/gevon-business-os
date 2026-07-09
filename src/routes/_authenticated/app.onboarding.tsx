import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLookups, createCompany, listMyCompanies } from "@/lib/core.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const fnLookups = useServerFn(listLookups);
  const fnCreate = useServerFn(createCompany);
  const fnList = useServerFn(listMyCompanies);
  const { data: lookups } = useQuery({ queryKey: ["lookups"], queryFn: () => fnLookups({}) });

  const [name, setName] = useState("");
  const [country, setCountry] = useState("NG");
  const [currency, setCurrency] = useState("NGN");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [locale, setLocale] = useState("en");
  const [submitting, setSubmitting] = useState(false);

  const countries = lookups?.countries ?? [];
  const selectedCountry = useMemo(() => countries.find((c: any) => c.code === country), [countries, country]);
  useEffect(() => {
    if (selectedCountry?.default_currency) setCurrency(selectedCountry.default_currency);
  }, [selectedCountry]);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-8">
        <p className="font-display text-xs font-medium uppercase tracking-widest text-brand">Set up</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Create your company</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is your Gevon workspace. You can add branches, invite people, and enable modules next.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await fnCreate({ data: { name, countryCode: country, currencyCode: currency, timezone, locale } });
            await fnList({}); // warm the cache
            toast.success("Company created");
            navigate({ to: "/app", replace: true });
          } catch (err: any) {
            toast.error(err.message ?? "Could not create company");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="c-name">Company name</Label>
          <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Ltd." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map((c: any) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(lookups?.currencies ?? []).map((c: any) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(lookups?.timezones ?? []).map((c: any) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(lookups?.locales ?? []).map((c: any) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting || !name}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create company
        </Button>
      </form>
    </div>
  );
}
