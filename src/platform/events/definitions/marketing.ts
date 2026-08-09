import { z } from "zod";
import type { EventDefinition } from "../registry";

/** Milestone 11 — Customer Growth & Marketing events. */
const base = { companyId: z.string().uuid() };

export const marketingEvents: EventDefinition[] = [
  {
    key: "customer.segment_entered",
    version: 1,
    publisherModuleId: "marketing",
    description: "A customer entered a segment.",
    payloadSchema: z.object({ ...base, segmentId: z.string().uuid(), segmentName: z.string(), customerId: z.string().uuid() }),
    subscribers: [],
  },
  {
    key: "customer.segment_left",
    version: 1,
    publisherModuleId: "marketing",
    description: "A customer left a segment.",
    payloadSchema: z.object({ ...base, segmentId: z.string().uuid(), segmentName: z.string(), customerId: z.string().uuid() }),
    subscribers: [],
  },
  {
    key: "loyalty.points_awarded",
    version: 1,
    publisherModuleId: "marketing",
    description: "Loyalty points were awarded to a customer.",
    payloadSchema: z.object({ ...base, customerId: z.string().uuid(), programId: z.string().uuid(), points: z.number(), balance: z.number() }),
    subscribers: [],
  },
  {
    key: "loyalty.points_redeemed",
    version: 1,
    publisherModuleId: "marketing",
    description: "Loyalty points were redeemed.",
    payloadSchema: z.object({ ...base, customerId: z.string().uuid(), programId: z.string().uuid(), points: z.number(), balance: z.number() }),
    subscribers: [],
  },
  {
    key: "loyalty.tier_reached",
    version: 1,
    publisherModuleId: "marketing",
    description: "A customer reached a new loyalty tier.",
    payloadSchema: z.object({ ...base, customerId: z.string().uuid(), programId: z.string().uuid(), tier: z.string() }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/loyalty",
      },
    ],
  },
];
