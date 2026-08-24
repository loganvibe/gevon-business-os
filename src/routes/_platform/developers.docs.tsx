import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { API_DOCS, EVENT_CATALOG } from "@/platform/integrations/docs";
import { BookOpen, FileText, Radio } from "lucide-react";

export const Route = createFileRoute("/_platform/developers/docs")({ component: Page });

function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader eyebrow="Developers" title="Documentation" description="API references, webhook guides, and event catalog." />
      <div className="grid gap-4 md:grid-cols-2">
        {API_DOCS.map((page) => (
          <Card key={page.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 font-medium"><BookOpen className="h-4 w-4" /> {page.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 font-medium mb-2"><Radio className="h-4 w-4" /> Event catalog</div>
          <div className="divide-y divide-border">
            {EVENT_CATALOG.map((evt) => (
              <div key={evt.id} className="py-2">
                <div className="font-medium text-sm">{evt.name}</div>
                <div className="text-xs text-muted-foreground">{evt.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
