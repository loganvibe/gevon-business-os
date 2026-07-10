import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "@/platform/customer.functions";
import { useActiveCompany } from "@/routes/_authenticated/app";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/settings/subscription")({ component: Page });

function Page() {
  const company = useActiveCompany();
  const fn = useServerFn(getMySubscription);
  const { data } = useQuery({
    queryKey: ["subscription", company.id],
    queryFn: () => fn({ data: { companyId: company.id } }),
  });
  const sub = data?.subscription as any;
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Settings" title="Subscription" description="Your Gevon plan and what's included." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            <span className="font-display text-xl">{sub?.plans?.name ?? "Starter"}</span>
            <Badge variant="outline">{sub?.status ?? "trial"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">{sub?.plans?.description}</p>
          {sub?.trial_ends_at && (
            <p>Trial ends <strong>{new Date(sub.trial_ends_at).toLocaleDateString()}</strong>.</p>
          )}
          <p className="text-xs text-muted-foreground">Billing and self-service plan changes ship in Milestone 3.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Modules included in your plan</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(data?.includedModules ?? []).map((m: any) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="font-display font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">— {m.description}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
