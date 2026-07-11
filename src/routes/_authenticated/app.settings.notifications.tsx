import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyPreferences, setPreference } from "@/platform/notifications/notify.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = ["system", "business", "security", "ai", "billing", "modules"] as const;
const CHANNELS = ["email", "in_app"] as const;

export const Route = createFileRoute("/_authenticated/app/settings/notifications")({ component: Page });

function Page() {
  const load = useServerFn(getMyPreferences);
  const save = useServerFn(setPreference);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["prefs", "mine"], queryFn: () => load({}) });
  const prefs = new Map<string, boolean>();
  for (const p of data?.prefs ?? []) prefs.set(`${p.channel}:${p.category}`, p.enabled);

  const isEnabled = (channel: string, category: string) =>
    prefs.get(`${channel}:${category}`) ?? true;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Settings" title="Notification preferences" description="Choose how you want to hear from Gevon." />
      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-3">Category</th>
                {CHANNELS.map((c) => <th key={c} className="pb-3 text-center capitalize">{c.replace("_", " ")}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td className="py-3 capitalize">{cat}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch} className="py-3 text-center">
                      <Switch
                        checked={isEnabled(ch, cat)}
                        onCheckedChange={async (v) => {
                          await save({ data: { channel: ch, category: cat, enabled: v } });
                          qc.invalidateQueries({ queryKey: ["prefs"] });
                        }}
                        disabled={cat === "security"}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">Security alerts are always on. Digest and quiet hours are coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
