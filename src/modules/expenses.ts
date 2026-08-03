/**
 * Expenses & Business Finance module manifest (Milestone 7).
 * ----------------------------------------------------------
 * Gevon's universal money-out engine. Every business — retail, service,
 * logistics, agency — records what it spends here. Combined with the Sales
 * module it answers the owner's core question:
 * "What is coming in, what is going out, and how healthy is my business?"
 */
import type { ModuleManifest } from "@/platform/registry";

export const expensesModule: ModuleManifest = {
  id: "expenses",
  name: "Expenses & Finance",
  description:
    "Record business spending, approve expenses, track payments, and see income vs expenses at a glance.",
  category: "finance",
  icon: "receipt",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core"],
  permissions: [
    { key: "expense.view", description: "View expenses and expense reports" },
    { key: "expense.create", description: "Record new expenses" },
    { key: "expense.update", description: "Edit expenses, categories and payments" },
    { key: "expense.delete", description: "Delete expenses" },
    { key: "expense.approve", description: "Approve or reject expenses" },
  ],
  navigation: [
    {
      label: "Finance",
      to: "/app/expenses",
      icon: "receipt",
      order: 95,
      permission: "expense.view",
      children: [
        { label: "Expenses", to: "/app/expenses", icon: "receipt" },
        { label: "Categories", to: "/app/expenses/categories", icon: "tags" },
        { label: "Financial overview", to: "/app/finance", icon: "trending-up" },
      ],
    },
  ],
  widgets: [
    { key: "expenses.today", name: "Today's expenses", slots: ["dashboard"] },
    { key: "expenses.month", name: "This month's expenses", slots: ["dashboard"] },
    { key: "expenses.by_category", name: "Expenses by category", slots: ["dashboard"] },
    { key: "expenses.pending_approval", name: "Pending approvals", slots: ["dashboard"] },
    { key: "expenses.income_vs_expenses", name: "Income vs expenses", slots: ["dashboard"] },
    { key: "expenses.estimated_profit", name: "Estimated profit", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    {
      key: "expenses.spend_analysis",
      name: "Spending analysis",
      description: "Explain where the business money is going and highlight anomalies.",
    },
    {
      key: "expenses.cost_reduction",
      name: "Cost reduction suggestions",
      description: "Suggest categories where spending can safely be reduced.",
    },
    {
      key: "expenses.cashflow_forecast",
      name: "Cash flow forecast",
      description: "Project upcoming cash position from recurring income and expenses.",
    },
  ],
  featureFlags: [
    { key: "expenses.enabled", name: "Expenses module", defaultStatus: "beta" },
    { key: "expenses.approvals", name: "Expense approval workflow", defaultStatus: "beta" },
  ],
};
