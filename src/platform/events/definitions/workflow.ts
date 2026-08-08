import { z } from "zod";
import type { EventDefinition } from "../registry";

/**
 * Milestone 10 — Workflow & Automation events.
 * These are published by the workflow module and consumed by the standard
 * notification fan-out. Business modules never talk to users directly.
 */
export const workflowEvents: EventDefinition[] = [
  {
    key: "task.created",
    version: 1,
    publisherModuleId: "workflow",
    description: "A task was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      taskId: z.string().uuid(),
      title: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.recipientUserId",
        deepLink: "/app/tasks",
      },
    ],
  },
  {
    key: "task.completed",
    version: 1,
    publisherModuleId: "workflow",
    description: "A task was completed.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      taskId: z.string().uuid(),
      title: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "task.overdue",
    version: 1,
    publisherModuleId: "workflow",
    description: "A task passed its due date without being completed.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      taskId: z.string().uuid(),
      title: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "payload.recipientUserId",
        deepLink: "/app/tasks?filter=overdue",
      },
    ],
  },
  {
    key: "workflow.started",
    version: 1,
    publisherModuleId: "workflow",
    description: "A workflow run started.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      workflowId: z.string().uuid(),
      runId: z.string().uuid().optional(),
    }),
    subscribers: [],
  },
  {
    key: "workflow.completed",
    version: 1,
    publisherModuleId: "workflow",
    description: "A workflow run completed successfully.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      workflowId: z.string().uuid(),
      runId: z.string().uuid().optional(),
    }),
    subscribers: [],
  },
  {
    key: "workflow.escalated",
    version: 1,
    publisherModuleId: "workflow",
    description: "A pending approval was escalated to the next level.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      approvalRequestId: z.string().uuid(),
      level: z.number().int(),
    }),
    subscribers: [],
  },
  {
    key: "approval.requested",
    version: 1,
    publisherModuleId: "workflow",
    description: "An approval was requested.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      approvalRequestId: z.string().uuid(),
      subject: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "company.owners",
        deepLink: "/app/approvals",
      },
    ],
  },
  {
    key: "approval.approved",
    version: 1,
    publisherModuleId: "workflow",
    description: "An approval request was approved.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      approvalRequestId: z.string().uuid(),
      subject: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.recipientUserId",
        deepLink: "/app/approvals",
      },
    ],
  },
  {
    key: "approval.rejected",
    version: 1,
    publisherModuleId: "workflow",
    description: "An approval request was rejected.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      approvalRequestId: z.string().uuid(),
      subject: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "payload.recipientUserId",
        deepLink: "/app/approvals",
      },
    ],
  },
  {
    key: "request.created",
    version: 1,
    publisherModuleId: "workflow",
    description: "An internal request was submitted.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      requestId: z.string().uuid(),
      title: z.string(),
      requestType: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/requests",
      },
    ],
  },
  {
    key: "request.approved",
    version: 1,
    publisherModuleId: "workflow",
    description: "An internal request was approved.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      requestId: z.string().uuid(),
      title: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.recipientUserId",
        deepLink: "/app/requests",
      },
    ],
  },
  {
    key: "request.rejected",
    version: 1,
    publisherModuleId: "workflow",
    description: "An internal request was rejected.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      requestId: z.string().uuid(),
      title: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.recipientUserId",
        deepLink: "/app/requests",
      },
    ],
  },
  {
    key: "reminder.due",
    version: 1,
    publisherModuleId: "workflow",
    description: "A reminder became due.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      reminderId: z.string().uuid(),
      title: z.string(),
      recipientUserId: z.string().uuid().optional(),
    }),
    subscribers: [],
  },
];
