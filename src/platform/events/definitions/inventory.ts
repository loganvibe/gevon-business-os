import { z } from "zod";
import type { EventDefinition } from "../registry";

export const inventoryEvents: EventDefinition[] = [
  {
    key: "inventory.product.created",
    version: 1,
    publisherModuleId: "inventory",
    description: "A new product was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
      name: z.string(),
      createdBy: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.product.updated",
    version: 1,
    publisherModuleId: "inventory",
    description: "A product was updated.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.product.archived",
    version: 1,
    publisherModuleId: "inventory",
    description: "A product was archived.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.stock.received",
    version: 1,
    publisherModuleId: "inventory",
    description: "Stock received (purchase or opening balance).",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
      branchId: z.string().uuid(),
      quantity: z.number(),
      unitCost: z.number().optional(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.stock.adjusted",
    version: 1,
    publisherModuleId: "inventory",
    description: "Stock adjusted (adjustment / damaged / expired).",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
      branchId: z.string().uuid(),
      delta: z.number(),
      reason: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.stock.transferred",
    version: 1,
    publisherModuleId: "inventory",
    description: "Stock transferred between branches.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
      fromBranchId: z.string().uuid(),
      toBranchId: z.string().uuid(),
      quantity: z.number(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.stock.low_detected",
    version: 1,
    publisherModuleId: "inventory",
    description: "Stock for a product at a branch crossed the minimum threshold.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      productId: z.string().uuid(),
      branchId: z.string().uuid(),
      quantity: z.number(),
      minimum: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "company.owners",
        deepLink: "/app/inventory?filter=low-stock",
      },
    ],
  },
  {
    key: "inventory.supplier.created",
    version: 1,
    publisherModuleId: "inventory",
    description: "A new supplier was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      supplierId: z.string().uuid(),
      name: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "inventory.purchase.recorded",
    version: 1,
    publisherModuleId: "inventory",
    description: "A supplier purchase was recorded.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      purchaseId: z.string().uuid(),
      supplierId: z.string().uuid().nullable(),
      totalAmount: z.number(),
    }),
    subscribers: [],
  },
];
