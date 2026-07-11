import { z } from "zod";
import type { EventDefinition } from "../registry";

export const moduleEvents: EventDefinition[] = [
  {
    key: "module.enabled",
    version: 1,
    publisherModuleId: "core",
    description: "A module was enabled for a company.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      moduleId: z.string(),
      moduleName: z.string(),
      enabledBy: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "notification",
        templateKey: "module.enabled.in_app",
        category: "modules",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/settings/modules",
      },
    ],
  },
  {
    key: "module.disabled",
    version: 1,
    publisherModuleId: "core",
    description: "A module was disabled for a company.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      companyName: z.string(),
      moduleId: z.string(),
      moduleName: z.string(),
      disabledBy: z.string().uuid(),
    }),
    subscribers: [],
  },
];
