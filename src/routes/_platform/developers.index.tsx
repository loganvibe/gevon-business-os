import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2 } from "lucide-react";

export const Route = createFileRoute("/_platform/developers/")({ component: Page });

function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Developers" title="Gevon Developer Portal" description="Build and ship modules on Gevon BusinessOS." />
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4" /> Architecture ready</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            The plugin architecture is live. To author a module today: create
            <code className="mx-1 rounded bg-muted px-1">src/modules/&lt;id&gt;.ts</code> that exports a
            <code className="mx-1 rounded bg-muted px-1">ModuleManifest</code>, register it in
            <code className="mx-1 rounded bg-muted px-1">src/platform/registry.ts</code>, then click
            <em> Sync manifests</em> in the Modules admin screen.
          </p>
          <p className="text-muted-foreground">
            API keys, sandbox environments, and the module marketplace ship in a later milestone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
