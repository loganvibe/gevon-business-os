import { z } from "zod";
import type { EventDefinition } from "../registry";

export const billingEvents: EventDefinition[] = [
  {
    key: "subscription.updated",
    version: 1,
    publisherModuleId: "core",
    description: "A company's subscription plan or status changed.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      planKey: z.string(),
      status: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "billing",
        priority: "high",
        recipient: "company.owners",
        templateKey: "security.alert.in_app",
      },
    ],
  },
];
