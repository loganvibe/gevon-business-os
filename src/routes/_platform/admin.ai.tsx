import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAICapabilityConfigs, setAICapabilityConfig,
  listModelPricing, setModelPricing,
  listPlanAILimits, setPlanAILimit,
  listCompanyAICredits, adjustCompanyCredits,
} from "@/platform/ai.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_platform/admin/ai")({ component: Page });

const PROVIDERS = ["openrouter"] as const;
const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "meta-llama/llama-4-maverick",
  "deepseek/deepseek-chat",
];
const PLANS = ["starter", "professional", "enterprise", "custom"] as const;

function Page() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("capabilities");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="AI Control Center" description="Manage AI providers, models, credits, and limits." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="pricing">Model Pricing</TabsTrigger>
          <TabsTrigger value="plans">Plan Limits</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>
        <TabsContent value="capabilities"><CapabilitiesTab qc={qc} /></TabsContent>
        <TabsContent value="pricing"><PricingTab qc={qc} /></TabsContent>
        <TabsContent value="plans"><PlansTab qc={qc} /></TabsContent>
        <TabsContent value="credits"><CreditsTab qc={qc} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CapabilitiesTab({ qc }: { qc: any }) {
  const list = useServerFn(listAICapabilityConfigs);
  const setCfg = useServerFn(setAICapabilityConfig);
  const { data } = useQuery({ queryKey: ["admin", "ai-configs"], queryFn: () => list({}) });

  const mut = useMutation({
    mutationFn: async (v: { key: string; patch: Record<string, any> }) => setCfg({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin", "ai-configs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {(data ?? []).map((cfg: any) => (
            <div key={cfg.capability_key} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-medium">{cfg.capability_key}</span>
                  <Badge variant={cfg.enabled ? "default" : "outline"}>{cfg.enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  provider: {cfg.provider} · model: {cfg.model} · credits/1k: {cfg.credit_cost_per_1k_tokens ?? 0.01}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={cfg.provider} onValueChange={(v) => mut.mutate({ key: cfg.capability_key, patch: { provider: v } })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={cfg.model} onValueChange={(v) => mut.mutate({ key: cfg.capability_key, patch: { model: v } })}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ key: cfg.capability_key, patch: { enabled: !cfg.enabled } })}>
                  {cfg.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
          {(data?.length ?? 0) === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No AI capability configs found.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function PricingTab({ qc }: { qc: any }) {
  const list = useServerFn(listModelPricing);
  const setP = useServerFn(setModelPricing);
  const { data } = useQuery({ queryKey: ["admin", "ai-pricing"], queryFn: () => list({}) });
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ inputPricePer1k: 0, outputPricePer1k: 0, isActive: true });

  const mut = useMutation({
    mutationFn: (v: any) => setP({ data: v }),
    onSuccess: () => { toast.success("Pricing updated"); qc.invalidateQueries({ queryKey: ["admin", "ai-pricing"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {(data ?? []).map((p: any) => (
            <div key={`${p.provider}:${p.model}`} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-display font-medium">{p.model}</div>
                <div className="text-xs text-muted-foreground">provider: {p.provider} · currency: {p.currency}</div>
              </div>
              {editing === `${p.provider}:${p.model}` ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="number" step="0.0001" className="w-28" value={form.inputPricePer1k} onChange={(e) => setForm({ ...form, inputPricePer1k: parseFloat(e.target.value) })} />
                  <Input type="number" step="0.0001" className="w-28" value={form.outputPricePer1k} onChange={(e) => setForm({ ...form, outputPricePer1k: parseFloat(e.target.value) })} />
                  <Button size="sm" onClick={() => mut.mutate({ provider: p.provider, model: p.model, inputPricePer1k: form.inputPricePer1k, outputPricePer1k: form.outputPricePer1k, isActive: form.isActive })}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">in: ${p.input_price_per_1k}/1k · out: ${p.output_price_per_1k}/1k</span>
                  <Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(`${p.provider}:${p.model}`); setForm({ inputPricePer1k: p.input_price_per_1k, outputPricePer1k: p.output_price_per_1k, isActive: p.is_active }); }}>Edit</Button>
                </div>
              )}
            </div>
          ))}
          {(data?.length ?? 0) === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No model pricing configured.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlansTab({ qc }: { qc: any }) {
  const list = useServerFn(listPlanAILimits);
  const setL = useServerFn(setPlanAILimit);
  const { data } = useQuery({ queryKey: ["admin", "ai-plan-limits"], queryFn: () => list({}) });

  const mut = useMutation({
    mutationFn: (v: any) => setL({ data: v }),
    onSuccess: () => { toast.success("Plan limits updated"); qc.invalidateQueries({ queryKey: ["admin", "ai-plan-limits"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {(data ?? []).map((pl: any) => (
            <div key={pl.plan_key} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-display font-medium">{pl.plan_key}</div>
                <div className="text-xs text-muted-foreground">monthly: {pl.monthly_credits} · daily: {pl.daily_limit} · trial: {pl.trial_credits}</div>
              </div>
              <PlanForm plan={pl} onSave={(patch) => mut.mutate({ planKey: pl.plan_key, ...patch })} />
            </div>
          ))}
          {(data?.length ?? 0) === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No plan limits configured.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlanForm({ plan, onSave }: { plan: any; onSave: (v: any) => void }) {
  const [monthly, setMonthly] = useState(plan.monthly_credits);
  const [daily, setDaily] = useState(plan.daily_limit);
  const [trial, setTrial] = useState(plan.trial_credits);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    await onSave({ monthlyCredits: Number(monthly), dailyLimit: Number(daily), trialCredits: Number(trial) });
    setSaving(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Monthly credits</Label>
        <Input type="number" className="w-28" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Daily limit</Label>
        <Input type="number" className="w-28" value={daily} onChange={(e) => setDaily(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Trial credits</Label>
        <Input type="number" className="w-28" value={trial} onChange={(e) => setTrial(e.target.value)} />
      </div>
      <Button size="sm" disabled={saving} onClick={submit}>Save</Button>
    </div>
  );
}

function CreditsTab({ qc }: { qc: any }) {
  const list = useServerFn(listCompanyAICredits);
  const adjust = useServerFn(adjustCompanyCredits);
  const { data } = useQuery({ queryKey: ["admin", "ai-credits"], queryFn: () => list({ data: {} }) });
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => adjust({ data: { companyId, amount, reason } }),
    onSuccess: () => { toast.success("Credits adjusted"); qc.invalidateQueries({ queryKey: ["admin", "ai-credits"] }); setAmount(0); setReason(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_100px_1fr_auto] sm:items-end">
          <div>
            <Label>Company ID</Label>
            <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="company-uuid" />
          </div>
          <div>
            <Label>Amount (+/-)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Compensation bonus" />
          </div>
          <Button disabled={!companyId || !amount || !reason || mut.isPending} onClick={() => mut.mutate()}>Adjust</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data ?? []).map((row: any) => (
              <div key={row.company_id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-display font-medium">{row.companies?.name ?? row.company_id}</div>
                  <div className="text-xs text-muted-foreground">
                    monthly: {row.monthly_credits} · bonus: {row.bonus_credits} · consumed: {row.consumed_credits}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">updated: {new Date(row.updated_at).toLocaleString()}</div>
              </div>
            ))}
            {(data?.length ?? 0) === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No company credit wallets found.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
