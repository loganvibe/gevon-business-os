/**
 * Job handler map. Each handler receives a Supabase admin client and the
 * job's payload; it must return void or throw.
 *
 * New job types register here — never elsewhere.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleEmailSend } from "./email.send";
import { handleNotificationDigest } from "./notification.digest";
import { handleIntegrationSync } from "./integration.sync";
import { handleDataImport } from "./integration.import";
import { handleAIExecute } from "./ai.execute";

export type JobHandler = (
  admin: SupabaseClient,
  payload: Record<string, any>,
  jobId: string,
) => Promise<Record<string, any> | void>;

export const JOB_HANDLERS: Record<string, JobHandler> = {
  "email.send": handleEmailSend,
  "notification.digest": handleNotificationDigest,
  "integration.sync": handleIntegrationSync,
  "integration.import": handleDataImport,
  "ai.execute": handleAIExecute,
};
