import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { startImport, getImportStatus, startExport, getExportStatus } from "@/modules/integrations/api/import-export.functions";
import { PageHeader } from "@/components/core/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileJson, Upload, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations/import-export")({ component: Page });

function Page() {
  const [companyId] = useState(() => {
    const id = localStorage.getItem("gevon:activeCompanyId");
    return id || "";
  });
  const [entityType, setEntityType] = useState("products");
  const [format, setFormat] = useState<"csv" | "excel" | "json">("csv");
  const qc = useQueryClient();
  const imports = useQuery({ queryKey: ["imports", companyId], queryFn: () => getImportStatus({ data: { id: "tmp" } }) });
  const startImp = useMutation({
    mutationFn: () => startImport({ data: { companyId, name: `Import ${entityType}`, entityType, format } }),
    onSuccess: () => { toast.success("Import started"); qc.invalidateQueries({ queryKey: ["imports"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const startExp = useMutation({
    mutationFn: () => startExport({ data: { companyId, name: `Export ${entityType}`, entityType, format } }),
    onSuccess: () => { toast.success("Export started"); qc.invalidateQueries({ queryKey: ["exports"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integrations" title="Data import / export" description="Move data in and out of Gevon." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 font-medium"><Upload className="h-4 w-4" /> Import data</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity type</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="suppliers">Suppliers</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => startImp.mutate()} className="w-full"><Upload className="mr-2 h-4 w-4" /> Start import</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 font-medium"><Download className="h-4 w-4" /> Export data</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity type</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="suppliers">Suppliers</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => startExp.mutate()} className="w-full"><Download className="mr-2 h-4 w-4" /> Start export</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
