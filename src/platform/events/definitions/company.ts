import { z } from "zod";
import type { EventDefinition } from "../registry";

export const companyEvents: EventDefinition[] = [
  {
    key: "company.created",
    version: 1,
    publisherModuleId: "core",
    description: "A new company/tenant was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      createdBy: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "company.suspended",
    version: 1,
    publisherModuleId: "core",
    description: "A company was suspended by platform administrators.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      reason: z.string().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        templateKey: "security.alert.in_app",
        category: "security",
        priority: "critical",
        recipient: "company.owners",
      },
    ],
  },
];
