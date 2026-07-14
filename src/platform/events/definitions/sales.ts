import { z } from "zod";
import type { EventDefinition } from "../registry";

export const salesEvents: EventDefinition[] = [
  {
    key: "sale.created",
    version: 1,
    publisherModuleId: "sales",
    description: "A draft sale was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid(),
      total: z.number(),
    }),
    subscribers: [],
  },
  {
    key: "sale.completed",
    version: 1,
    publisherModuleId: "sales",
    description: "A sale was completed and inventory decremented.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid(),
      total: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/sales?id={{saleId}}",
      },
    ],
  },
  {
    key: "sale.cancelled",
    version: 1,
    publisherModuleId: "sales",
    description: "A draft sale was cancelled.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "sale.returned",
    version: 1,
    publisherModuleId: "sales",
    description: "A return was processed against a completed sale.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid(),
      returnId: z.string().uuid(),
      total: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/returns?id={{returnId}}",
      },
    ],
  },
  {
    key: "order.created",
    version: 1,
    publisherModuleId: "sales",
    description: "A new order was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      orderId: z.string().uuid(),
      channel: z.string(),
      total: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/orders?id={{orderId}}",
      },
    ],
  },
  {
    key: "order.completed",
    version: 1,
    publisherModuleId: "sales",
    description: "An order was completed and turned into a sale.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      orderId: z.string().uuid(),
      saleId: z.string().uuid().nullable().optional(),
    }),
    subscribers: [],
  },
  {
    key: "payment.received",
    version: 1,
    publisherModuleId: "sales",
    description: "A payment was recorded against a sale or order.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      saleId: z.string().uuid().nullable().optional(),
      amount: z.number(),
      method: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "billing",
        priority: "normal",
        recipient: "company.owners",
      },
    ],
  },
];
