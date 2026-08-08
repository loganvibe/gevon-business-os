/**
 * Workflow & Automation module manifest (Milestone 10).
 * Generic engine: any module can trigger workflows via the event bus.
 */
import type { ModuleManifest } from "@/platform/registry";

export const workflowModule: ModuleManifest = {
  id: "workflow",
  name: "Work & Automation",
  description:
    "Tasks, approvals, internal requests, reminders and automation rules that connect every Gevon module.",
  category: "productivity",
  icon: "workflow",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core"],
  permissions: [
    { key: "task.view", description: "View tasks" },
    { key: "task.create", description: "Create tasks" },
    { key: "task.update", description: "Update tasks and comments" },
    { key: "task.assign", description: "Assign or reassign tasks" },
    { key: "task.delete", description: "Delete tasks" },
    { key: "workflow.view", description: "View workflows and run history" },
    { key: "workflow.manage", description: "Create and manage workflows" },
    { key: "workflow.execute", description: "Execute and retry workflow runs" },
    { key: "approval.view", description: "View approval requests" },
    { key: "approval.approve", description: "Approve or reject approval requests" },
    { key: "approval.manage", description: "Manage approvals" },
    { key: "request.view", description: "View internal requests" },
    { key: "request.create", description: "Create internal requests" },
    { key: "request.approve", description: "Approve internal requests" },
    { key: "automation.view", description: "View automation rules" },
    { key: "automation.manage", description: "Manage automation rules" },
    { key: "calendar.view", description: "View the business calendar" },
    { key: "calendar.manage", description: "Manage calendar events" },
  ],
  navigation: [
    {
      label: "Work",
      to: "/app/tasks",
      icon: "check-square",
      order: 60,
      permission: "task.view",
      children: [
        { label: "My tasks", to: "/app/tasks", icon: "check-square" },
        { label: "Approvals", to: "/app/approvals", icon: "stamp", permission: "approval.view" },
        { label: "Requests", to: "/app/requests", icon: "inbox" },
        { label: "Calendar", to: "/app/calendar", icon: "calendar", permission: "calendar.view" },
        { label: "Workflows", to: "/app/workflows", icon: "workflow", permission: "workflow.view" },
        { label: "Automations", to: "/app/automation", icon: "zap", permission: "automation.view" },
      ],
    },
  ],
  widgets: [
    { key: "workflow.my_tasks", name: "My tasks", slots: ["dashboard"] },
    { key: "workflow.pending_approvals", name: "Pending approvals", slots: ["dashboard"] },
    { key: "workflow.overdue_tasks", name: "Overdue tasks", slots: ["dashboard"] },
    { key: "workflow.pending_requests", name: "Pending requests", slots: ["dashboard"] },
    { key: "workflow.active_automations", name: "Active automations", slots: ["dashboard"] },
    { key: "workflow.upcoming_reminders", name: "Upcoming reminders", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    {
      key: "workflow.workflow_suggestions",
      name: "Workflow suggestions",
      description: "Suggest automations based on how the business already operates.",
    },
    {
      key: "workflow.task_prioritization",
      name: "Task prioritisation",
      description: "Rank open tasks by urgency and business impact.",
    },
    {
      key: "workflow.approval_risk_analysis",
      name: "Approval risk analysis",
      description: "Highlight approval requests that look unusual or risky.",
    },
    {
      key: "workflow.automation_recommendations",
      name: "Automation recommendations",
      description: "Recommend rules that would remove repetitive manual work.",
    },
  ],
  featureFlags: [
    { key: "workflow.enabled", name: "Work & automation module", defaultStatus: "beta" },
    { key: "workflow.builder", name: "Visual workflow builder", defaultStatus: "beta" },
  ],
};
