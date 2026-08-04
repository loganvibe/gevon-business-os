/**
 * People & Organization module manifest (Milestone 8).
 * ----------------------------------------------------
 * Gevon's universal workforce engine. Retail, supermarkets, restaurants,
 * pharmacies, construction, manufacturing and service businesses all manage
 * the same core primitives: people, where they work, when they work, what
 * they are paid, and how they perform.
 */
import type { ModuleManifest } from "@/platform/registry";

export const peopleModule: ModuleManifest = {
  id: "people",
  name: "People & Organization",
  description:
    "Manage employees, departments, attendance, leave, payroll, performance, shifts and recruitment.",
  category: "people",
  icon: "users",
  version: "1.0.0",
  subscriptionTier: "starter",
  isCore: false,
  dependencies: ["core"],
  permissions: [
    { key: "employee.view", description: "View employees and people records" },
    { key: "employee.manage", description: "Create and edit employees and departments" },
    { key: "attendance.manage", description: "Manage attendance records and shift schedules" },
    { key: "leave.manage", description: "Approve and manage leave requests" },
    { key: "payroll.manage", description: "Manage payroll cycles and payroll items" },
    { key: "performance.manage", description: "Manage performance reviews" },
    { key: "recruitment.manage", description: "Manage job positions and candidates" },
  ],
  navigation: [
    {
      label: "People",
      to: "/app/people",
      icon: "users",
      order: 60,
      permission: "employee.view",
      children: [
        { label: "Employees", to: "/app/people", icon: "users" },
        { label: "Departments", to: "/app/people/departments", icon: "network" },
        { label: "Attendance", to: "/app/people/attendance", icon: "clock" },
        { label: "Leave", to: "/app/people/leave", icon: "calendar-days" },
        { label: "Shifts", to: "/app/people/shifts", icon: "calendar-clock" },
        { label: "Payroll", to: "/app/people/payroll", icon: "banknote", permission: "payroll.manage" },
        { label: "Performance", to: "/app/people/performance", icon: "target" },
        { label: "Recruitment", to: "/app/people/recruitment", icon: "user-plus", permission: "recruitment.manage" },
      ],
    },
  ],
  widgets: [
    { key: "people.headcount", name: "Headcount", slots: ["dashboard"] },
    { key: "people.present_today", name: "Present today", slots: ["dashboard"] },
    { key: "people.on_leave", name: "On leave", slots: ["dashboard"] },
    { key: "people.pending_leave", name: "Pending leave approvals", slots: ["dashboard"] },
    { key: "people.payroll_next", name: "Next payroll", slots: ["dashboard"] },
    { key: "people.open_positions", name: "Open positions", slots: ["dashboard"] },
  ],
  aiCapabilities: [
    {
      key: "people.attendance_insights",
      name: "Attendance insights",
      description: "Spot lateness, absenteeism and staffing gaps across branches.",
    },
    {
      key: "people.shift_optimization",
      name: "Shift optimization",
      description: "Suggest shift rosters that match demand while respecting leave.",
    },
    {
      key: "people.payroll_review",
      name: "Payroll review",
      description: "Flag unusual payroll changes before a cycle is approved.",
    },
    {
      key: "people.candidate_screening",
      name: "Candidate screening",
      description: "Summarize and rank applicants against a job position.",
    },
  ],
  featureFlags: [
    { key: "people.enabled", name: "People module", defaultStatus: "beta" },
    { key: "people.payroll", name: "Payroll foundation", defaultStatus: "internal" },
    { key: "people.recruitment", name: "Recruitment foundation", defaultStatus: "beta" },
  ],
};
