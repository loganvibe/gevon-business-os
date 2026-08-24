import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listIndustryProfiles } from "@/platform/industry/onboarding.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Utensils, Pill, Truck, HardHat, Factory, Briefcase, Hotel, GraduationCap, Sprout } from "lucide-react";

const ICONS: Record<string, any> = { store: Store, utensils: Utensils, pill: Pill, truck: Truck, "hard-hat": HardHat, factory: Factory, briefcase: Briefcase, hotel: Hotel, "graduation-cap": GraduationCap, sprout: Sprout };

export const Route = createFileRoute("/_platform/admin/industry-profiles")({ component: Page });

function Page() {
  const profiles = useQuery({ queryKey: ["industry-profiles"], queryFn: () => listIndustryProfiles({}) });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <PageHeader eyebrow="Platform" title="Industry Profiles" description="Manage business-type configurations and recommendations." />
      <div className="grid gap-4 md:grid-cols-2">
        {(profiles.data ?? []).map((p: any) => {
          const Icon = ICONS[p.icon] ?? Store;
          return (
            <Card key={p.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4" /> {p.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(p.recommendedModules ?? []).slice(0, 6).map((m: string) => (
                    <Badge key={m} variant="secondary">{m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
