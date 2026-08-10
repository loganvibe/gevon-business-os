/**
 * Commerce Engine events (Milestone 12).
 * -------------------------------------
 * Every commerce channel (native POS, storefront, QR, WhatsApp, delivery,
 * future external POS adapters) publishes through these definitions, so
 * notifications, workflows, automation rules, finance and BI all react to
 * commerce through the single platform event bus.
 */
import { z } from "zod";
import type { EventDefinition } from "../registry";

const base = {
  companyId: z.string().uuid(),
};

export const commerceEvents: EventDefinition[] = [
  {
    key: "commerce.checkout.created",
    version: 1,
    publisherModuleId: "commerce",
    description: "A checkout (cart) was opened on a commerce channel.",
    payloadSchema: z.object({
      ...base,
      cartId: z.string().uuid(),
      channel: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "commerce.sale.completed",
    version: 1,
    publisherModuleId: "commerce",
    description: "A checkout was completed and materialised as a sale.",
    payloadSchema: z.object({
      ...base,
      cartId: z.string().uuid().nullable().optional(),
      saleId: z.string().uuid(),
      channel: z.string(),
      total: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/commerce",
      },
    ],
  },
  {
    key: "commerce.order.created",
    version: 1,
    publisherModuleId: "commerce",
    description: "An order was created from a commerce channel.",
    payloadSchema: z.object({
      ...base,
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
    key: "commerce.order.confirmed",
    version: 1,
    publisherModuleId: "commerce",
    description: "An order was confirmed and moved into fulfilment.",
    payloadSchema: z.object({ ...base, orderId: z.string().uuid() }),
    subscribers: [],
  },
  {
    key: "commerce.order.completed",
    version: 1,
    publisherModuleId: "commerce",
    description: "An order was fulfilled and completed.",
    payloadSchema: z.object({
      ...base,
      orderId: z.string().uuid(),
      saleId: z.string().uuid().nullable().optional(),
    }),
    subscribers: [],
  },
  {
    key: "commerce.order.cancelled",
    version: 1,
    publisherModuleId: "commerce",
    description: "An order was cancelled.",
    payloadSchema: z.object({ ...base, orderId: z.string().uuid(), reason: z.string().nullable().optional() }),
    subscribers: [],
  },
  {
    key: "commerce.receipt.created",
    version: 1,
    publisherModuleId: "commerce",
    description: "A receipt was issued for a completed sale or order.",
    payloadSchema: z.object({
      ...base,
      receiptId: z.string().uuid(),
      receiptNumber: z.string(),
      saleId: z.string().uuid().nullable().optional(),
      total: z.number(),
    }),
    subscribers: [],
  },
  {
    key: "commerce.delivery.created",
    version: 1,
    publisherModuleId: "commerce",
    description: "A delivery was created for an order or sale.",
    payloadSchema: z.object({
      ...base,
      deliveryId: z.string().uuid(),
      orderId: z.string().uuid().nullable().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/deliveries",
      },
    ],
  },
  {
    key: "commerce.delivery.completed",
    version: 1,
    publisherModuleId: "commerce",
    description: "A delivery reached the customer.",
    payloadSchema: z.object({ ...base, deliveryId: z.string().uuid() }),
    subscribers: [],
  },
  {
    key: "commerce.reservation.created",
    version: 1,
    publisherModuleId: "commerce",
    description: "A reservation was requested.",
    payloadSchema: z.object({
      ...base,
      reservationId: z.string().uuid(),
      reservedFor: z.string(),
      partySize: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/reservations",
      },
    ],
  },
  {
    key: "commerce.reservation.confirmed",
    version: 1,
    publisherModuleId: "commerce",
    description: "A reservation was confirmed by the business.",
    payloadSchema: z.object({ ...base, reservationId: z.string().uuid() }),
    subscribers: [],
  },
  {
    key: "commerce.reservation.cancelled",
    version: 1,
    publisherModuleId: "commerce",
    description: "A reservation was cancelled.",
    payloadSchema: z.object({ ...base, reservationId: z.string().uuid() }),
    subscribers: [],
  },
];
