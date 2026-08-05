import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Check, X, Wallet, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
} from "@/modules/expenses/api/expenses.functions";
import { listExpenseCategories } from "@/modules/expenses/api/categories.functions";
import { recordExpensePayment } from "@/modules/expenses/api/payments.functions";

export const Route = createFileRoute("/_authenticated/app/expenses/")({
  component: ExpensesPage,
});

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function ExpensesPage() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const cid = localStorage.getItem("gevon:activeCompanyId");
    setCompanyId(cid);
    if (cid) {
      supabase
        .from("branches")
        .select("id")
        .eq("company_id", cid)
        .eq("is_headquarters", true)
        .maybeSingle()
        .then(({ data }) => setBranchId(data?.id ?? null));
    }
  }, []);

  const listFn = useServerFn(listExpenses);
  const catFn = useServerFn(listExpenseCategories);
  const createFn = useServerFn(createExpense);
  const approveFn = useServerFn(approveExpense);
  const rejectFn = useServerFn(rejectExpense);
  const deleteFn = useServerFn(deleteExpense);
  const payFn = useServerFn(recordExpensePayment);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", "list", companyId, status],
    queryFn: () =>
      listFn({
        data: {
          companyId: companyId!,
          ...(status !== "all" ? { status: status as never } : {}),
        },
      }),
    enabled: !!companyId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["expenses", "categories", companyId],
    queryFn: () => catFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const categoryName = useMemo(
    () => new Map(categories.map((c: any) => [c.id, c.name])),
    [categories],
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  // ---- new expense form state ----
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    taxAmount: "",
    categoryId: "",
    vendorName: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    notes: "",
  });

  async function submitExpenseForm(submitForApproval: boolean) {
    if (!companyId || !branchId) return toast.error("No active company or branch");
    const amount = Number(form.amount);
    if (!form.title.trim()) return toast.error("Give the expense a title");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount");
    try {
      await createFn({
        data: {
          companyId,
          branchId,
          title: form.title.trim(),
          amount,
          taxAmount: Number(form.taxAmount) || 0,
          categoryId: form.categoryId || null,
          vendorName: form.vendorName || undefined,
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod as never,
          notes: form.notes || undefined,
          submit: submitForApproval,
        },
      });
      toast.success(submitForApproval ? "Expense submitted for approval" : "Expense saved");
      setOpen(false);
      setForm({ ...form, title: "", amount: "", taxAmount: "", vendorName: "", notes: "" });
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save expense");
    }
  }

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  }

  const money = (n: number) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Record expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record expense</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="exp-title">What was it for?</Label>
                <Input
                  id="exp-title"
                  value={form.title}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Generator diesel"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-amount">Amount</Label>
                  <Input
                    id="exp-amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-tax">Tax (optional)</Label>
                  <Input
                    id="exp-tax"
                    inputMode="decimal"
                    value={form.taxAmount}
                    onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => setForm({ ...form, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Uncategorized" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-date">Date</Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-vendor">Paid to</Label>
                  <Input
                    id="exp-vendor"
                    value={form.vendorName}
                    maxLength={200}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Method</Label>
                  <Select
                    value={form.paymentMethod}
                    onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exp-notes">Notes</Label>
                <Textarea
                  id="exp-notes"
                  value={form.notes}
                  maxLength={2000}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => submitExpenseForm(false)}>
                Save as draft
              </Button>
              <Button onClick={() => submitExpenseForm(true)}>Submit for approval</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Number</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium text-right">Outstanding</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Loading expenses…
                </td>
              </tr>
            )}
            {!isLoading && expenses.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
            {expenses.map((e: any) => {
              const outstanding = Math.max(Number(e.total) - Number(e.amount_paid ?? 0), 0);
              return (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{e.expense_number}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{e.title}</div>
                    {e.vendor_name && (
                      <div className="text-xs text-muted-foreground">{e.vendor_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.category_id ? (categoryName.get(e.category_id) ?? "—") : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.expense_date}</td>
                  <td className="px-3 py-2 text-right">{money(e.total)}</td>
                  <td className="px-3 py-2 text-right">
                    {outstanding > 0 ? (
                      <span className="text-amber-600">{money(outstanding)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_STYLES[e.status] ?? ""} variant="secondary">
                      {e.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {(e.status === "draft" || e.status === "pending") && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Approve"
                            onClick={() =>
                              act(
                                () => approveFn({ data: { id: e.id, companyId: companyId! } }),
                                "Expense approved",
                              )
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Reject"
                            onClick={() =>
                              act(
                                () => rejectFn({ data: { id: e.id, companyId: companyId! } }),
                                "Expense rejected",
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {outstanding > 0 && e.status !== "rejected" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Mark outstanding amount as paid"
                          onClick={() =>
                            act(
                              () =>
                                payFn({
                                  data: {
                                    companyId: companyId!,
                                    expenseId: e.id,
                                    amount: outstanding,
                                    method: (e.payment_method ?? "cash") as never,
                                    currencyCode: e.currency_code,
                                  },
                                }),
                              "Payment recorded",
                            )
                          }
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete"
                        onClick={() =>
                          act(
                            () => deleteFn({ data: { id: e.id, companyId: companyId! } }),
                            "Expense deleted",
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
