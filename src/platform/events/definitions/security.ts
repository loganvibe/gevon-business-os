import { z } from "zod";
import type { EventDefinition } from "../registry";

export const securityEvents: EventDefinition[] = [
  {
    key: "security.alert",
    version: 1,
    publisherModuleId: "core",
    description: "A security event (login anomaly, permission escalation, etc.).",
    payloadSchema: z.object({
      companyId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      message: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    }),
    subscribers: [
      {
        kind: "notification",
        templateKey: "security.alert.in_app",
        category: "security",
        priority: "critical",
        recipient: "payload.userId",
      },
    ],
  },
  {
    key: "event.dead_letter",
    version: 1,
    publisherModuleId: "core",
    description: "An event exhausted its retries and was moved to dead letter.",
    payloadSchema: z.object({
      originalEventKey: z.string(),
      originalEventId: z.string().uuid(),
      lastError: z.string(),
    }),
    subscribers: [],
  },
];
