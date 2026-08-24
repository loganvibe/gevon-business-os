import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding, getOnboardingState, getRecommendedModules, listIndustryProfiles } from "@/platform/industry/onboarding.functions";
import { listMyCompanies } from "@/lib/core.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Store, Utensils, Pill, Truck, HardHat, Factory, Briefcase, Hotel, GraduationCap, Sprout } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const ICONS: Record<string, any> = { store: Store, utensils: Utensils, pill: Pill, truck: Truck, "hard-hat": HardHat, factory: Factory, briefcase: Briefcase, hotel: Hotel, "graduation-cap": GraduationCap, sprout: Sprout };

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const fnList = useServerFn(listMyCompanies);
  const { data: companies } = useQuery({ queryKey: ["companies", "mine"], queryFn: () => fnList({}) });
  const companyId = companies?.companies?.[0]?.id ?? null;
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState("");
  const [size, setSize] = useState("");
  const [operations, setOperations] = useState<string[]>([]);
  const profiles = useQuery({ queryKey: ["industry-profiles"], queryFn: () => listIndustryProfiles({}) });
  const state = useQuery({ queryKey: ["onboarding", companyId], queryFn: () => getOnboardingState({ data: { companyId: companyId! } }), enabled: !!companyId });
  const qc = useQueryClient();
  const complete = useMutation({
    mutationFn: () => completeOnboarding({ data: { companyId: companyId!, industryKey: selected, businessSize: size, primaryOperations: operations, selectedModules: [] } }),
    onSuccess: () => { toast.success("Welcome to Gevon!"); qc.invalidateQueries(); navigate({ to: "/app", replace: true }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!companyId) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Welcome to Gevon</h1>
          <p className="mt-1 text-muted-foreground">Let's set up your workspace in a few steps.</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-4xl">🏢</div>
            <div>
              <div className="font-display text-lg font-medium">Create your company first</div>
              <div className="text-sm text-muted-foreground">You need a company before we can configure your workspace.</div>
            </div>
            <Button onClick={() => navigate({ to: "/app/onboarding", replace: true })} className="w-full">Create company</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    { title: "Choose your business type", description: "Select the profile closest to your business." },
    { title: "Tell us about your size", description: "This helps us recommend the right features." },
    { title: "Primary operations", description: "What do you do most?" },
    { title: "Ready to go", description: "Your workspace is being prepared." },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Welcome to Gevon</h1>
        <p className="mt-1 text-muted-foreground">Let's set up your workspace in a few steps.</p>
      </div>
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${i <= step ? "border-foreground bg-foreground text-background" : "border-border"}`}>
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className="hidden md:inline">{s.title}</span>
          </div>
        ))}
      </div>
      {step === 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {(profiles.data ?? []).map((p: any) => {
            const Icon = ICONS[p.icon] ?? Store;
            return (
              <Card key={p.key} className={`cursor-pointer transition hover:border-foreground ${selected === p.key ? "border-foreground" : ""}`} onClick={() => setSelected(p.key)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </div>
                  {selected === p.key && <Badge className="ml-auto">Selected</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {step === 1 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">How big is your business?</div>
            {["sole_proprietor", "micro", "small", "medium", "large"].map((s) => (
              <Button key={s} variant={size === s ? "default" : "outline"} className="w-full justify-start" onClick={() => setSize(s)}>
                {s.replace("_", " ")}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      {step === 2 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">What are your primary operations?</div>
            {["Sales", "Inventory", "Purchasing", "Customers", "Employees", "Finance", "Reports"].map((op) => (
              <Button key={op} variant={operations.includes(op) ? "default" : "outline"} className="w-full justify-start" onClick={() => setOperations(operations.includes(op) ? operations.filter((x) => x !== op) : [...operations, op])}>
                {op}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      {step === 3 && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <div>
              <div className="font-display text-lg font-medium">Your workspace is ready</div>
              <div className="text-sm text-muted-foreground">We've configured Gevon based on your business profile.</div>
            </div>
            <Button onClick={() => complete.mutate()} className="w-full">Go to dashboard</Button>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        <Button disabled={step === 0 && !selected} onClick={() => step < 3 ? setStep((s) => s + 1) : complete.mutate()}>
          {step === 2 ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
