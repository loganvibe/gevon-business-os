/**
 * Gevon Communication Platform — Event Registry
 * ---------------------------------------------
 * In-code source of truth for every platform event. Business modules
 * publish only events declared here; the DB table `public.platform_events`
 * mirrors this registry (synced by `admin.syncEvents()`).
 *
 * Each event declares:
 *  - key (dot-namespaced, e.g. `invoice.paid`)
 *  - version (bump on breaking payload change)
 *  - publisher module id
 *  - payload Zod schema
 *  - subscribers (declarative fan-out: in-app notification, email, job, ai)
 */
import { z } from "zod";
import { identityEvents } from "./definitions/identity";
import { companyEvents } from "./definitions/company";
import { moduleEvents } from "./definitions/module";
import { billingEvents } from "./definitions/billing";
import { securityEvents } from "./definitions/security";
import { inventoryEvents } from "./definitions/inventory";
import { salesEvents } from "./definitions/sales";
import { expenseEvents } from "./definitions/expenses";
import { peopleEvents } from "./definitions/people";

export type EventSubscriberKind = "notification" | "email" | "job" | "ai";

export interface NotificationSubscriber {
  kind: "notification";
  /** Template key in `public.notification_templates` OR inline title/message */
  templateKey?: string;
  category: "system" | "business" | "security" | "ai" | "billing" | "modules";
  priority?: "low" | "normal" | "high" | "critical";
  /** How to resolve the recipient user id from the payload. */
  recipient: "payload.userId" | "payload.recipientUserId" | "company.owners";
  /** Deep link path template; `{{var}}` interpolated from payload. */
  deepLink?: string;
}

export interface EmailSubscriber {
  kind: "email";
  /** React Email template key (must exist in email registry). */
  templateKey: string;
  recipient: "payload.email" | "payload.userId" | "company.owners";
  category: NotificationSubscriber["category"];
}

export interface JobSubscriber {
  kind: "job";
  jobType: string;
  /** Optional delay in seconds before job runs. */
  delaySeconds?: number;
}

export interface AISubscriber {
  kind: "ai";
  /** AI capability key from module registry. */
  capabilityKey: string;
}

export type EventSubscriber =
  | NotificationSubscriber
  | EmailSubscriber
  | JobSubscriber
  | AISubscriber;

export interface EventDefinition<P extends z.ZodTypeAny = z.ZodTypeAny> {
  key: string;
  version: number;
  publisherModuleId: string;
  description: string;
  payloadSchema: P;
  subscribers: EventSubscriber[];
}

// -------------------------- Registry -----------------------------------

const EVENTS: EventDefinition[] = [
  ...identityEvents,
  ...companyEvents,
  ...moduleEvents,
  ...billingEvents,
  ...securityEvents,
  ...inventoryEvents,
  ...salesEvents,
  ...expenseEvents,
  ...peopleEvents,
];

const BY_KEY = new Map<string, EventDefinition>(EVENTS.map((e) => [e.key, e]));

export function allEvents(): EventDefinition[] {
  return EVENTS.slice();
}

export function getEvent(key: string): EventDefinition | undefined {
  return BY_KEY.get(key);
}

/** JSON-serializable summary for the DB mirror. */
export function serializeEvent(e: EventDefinition) {
  return {
    key: e.key,
    version: e.version,
    publisher_module_id: e.publisherModuleId,
    description: e.description,
    subscribers: e.subscribers as unknown as object[],
    is_active: true,
  };
}
