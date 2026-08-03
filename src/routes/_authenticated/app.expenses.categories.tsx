import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  listExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory,
} from "@/modules/expenses/server/categories.functions";

export const Route = createFileRoute("/_authenticated/app/expenses/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem("gevon:activeCompanyId")), []);

  const listFn = useServerFn(listExpenseCategories);
  const createFn = useServerFn(createExpenseCategory);
  const deleteFn = useServerFn(deleteExpenseCategory);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["expenses", "categories", companyId],
    queryFn: () => listFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function create() {
    if (!companyId) return;
    if (!name.trim()) return toast.error("Enter a category name");
    try {
      await createFn({ data: { companyId, name: name.trim(), description: description || undefined } });
      toast.success("Category created");
      setName("");
      setDescription("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["expenses", "categories"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create category");
    }
  }

  async function remove(id: string) {
    try {
      await deleteFn({ data: { id, companyId: companyId! } });
      toast.success("Category removed");
      qc.invalidateQueries({ queryKey: ["expenses", "categories"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove category");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New expense category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rent"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cat-desc">Description</Label>
                <Input
                  id="cat-desc"
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border divide-y">
        {isLoading && <div className="p-6 text-center text-muted-foreground">Loading…</div>}
        {!isLoading && categories.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            No categories yet. Enable the Finance module to get the standard set, or create your own.
          </div>
        )}
        {categories.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                {c.name}
                {c.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              {c.description && (
                <div className="text-xs text-muted-foreground">{c.description}</div>
              )}
            </div>
            {!c.is_system && (
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)} title="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
