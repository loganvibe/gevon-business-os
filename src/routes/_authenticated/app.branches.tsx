import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6" />
        <div>
          <h2 className="text-lg font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">Manage your business branches and locations.</p>
        </div>
      </div>
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Branch management is available in Company Settings.
      </div>
    </div>
  );
}
