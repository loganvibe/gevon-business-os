import { z } from "zod";
import type { EventDefinition } from "../registry";

/** Milestone 7 — Expenses & Business Finance events. */
export const expenseEvents: EventDefinition[] = [
  {
    key: "expense.created",
    version: 1,
    publisherModuleId: "expenses",
    description: "A new expense was recorded.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
      expenseNumber: z.string(),
      total: z.number(),
      createdBy: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "expense.updated",
    version: 1,
    publisherModuleId: "expenses",
    description: "An expense was updated.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "expense.submitted",
    version: 1,
    publisherModuleId: "expenses",
    description: "An expense was submitted for approval.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
      total: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/expenses?status=pending",
      },
    ],
  },
  {
    key: "expense.approved",
    version: 1,
    publisherModuleId: "expenses",
    description: "An expense was approved.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
      total: z.number(),
      approvedBy: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/expenses",
      },
    ],
  },
  {
    key: "expense.rejected",
    version: 1,
    publisherModuleId: "expenses",
    description: "An expense was rejected.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
      reason: z.string().nullable(),
    }),
    subscribers: [],
  },
  {
    key: "expense.paid",
    version: 1,
    publisherModuleId: "expenses",
    description: "An expense was fully paid.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
      amount: z.number(),
    }),
    subscribers: [],
  },
  {
    key: "expense.deleted",
    version: 1,
    publisherModuleId: "expenses",
    description: "An expense was deleted.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      expenseId: z.string().uuid(),
    }),
    subscribers: [],
  },
];
