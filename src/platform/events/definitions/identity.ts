import { z } from "zod";
import type { EventDefinition } from "../registry";

export const identityEvents: EventDefinition[] = [
  {
    key: "user.invited",
    version: 1,
    publisherModuleId: "core",
    description: "A user was invited to join a company.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      inviteId: z.string().uuid(),
      email: z.string().email(),
      roleName: z.string(),
      invitedBy: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "email",
        templateKey: "invitation",
        recipient: "payload.email",
        category: "system",
      },
    ],
  },
  {
    key: "role.changed",
    version: 1,
    publisherModuleId: "core",
    description: "A member's role in a company changed.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      userId: z.string().uuid(),
      roleName: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        templateKey: "role.changed.in_app",
        category: "system",
        priority: "high",
        recipient: "payload.userId",
        deepLink: "/app/settings",
      },
    ],
  },
  {
    key: "member.added",
    version: 1,
    publisherModuleId: "core",
    description: "A member joined a company.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      userId: z.string().uuid(),
    }),
    subscribers: [],
  },
];
