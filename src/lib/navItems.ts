import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileSignature,
  FileText,
  Headset,
  History,
  Hourglass,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

/**
 * The sidebar's item lists, kept apart from the shell that renders them so the
 * nav can be checked against ROUTE_ACCESS in a test: every path declared here
 * must have a row in that table, otherwise the sidebar can render a link whose
 * guard denies it -- the exact class of bug this table was introduced to end.
 *
 * Which of these a given user actually sees is decided solely by
 * canAccessRoute() in AppShell. There is deliberately no second, per-item
 * visibility rule.
 */

export type NavItem = { to: string; labelKey: string; icon: LucideIcon; badge?: number };

/** Shared by org users of every role. */
export const userNavItems: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/requests", labelKey: "nav.myRequests", icon: Send },
  { to: "/leaves", labelKey: "nav.leaves", icon: CalendarDays },
  { to: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { to: "/auto-verified", labelKey: "nav.autoVerified", icon: BadgeCheck },
];

/** Employee self-service. Staff reach the org-scoped equivalents instead. */
export const memberNavItems: NavItem[] = [
  { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardCheck },
  { to: "/my-letters", labelKey: "nav.myLetters", icon: FileSignature },
  { to: "/payroll", labelKey: "nav.payroll", icon: Wallet },
];

/** Org operations, for org_admin and (permission-gated) sub_admin. */
export const orgAdminNavItems: NavItem[] = [
  { to: "/org/team", labelKey: "nav.myTeam", icon: Users },
  { to: "/org/admins", labelKey: "nav.orgAdmins", icon: ShieldCheck },
  { to: "/org/leaves", labelKey: "nav.leaveRequests", icon: CalendarClock },
  { to: "/org/attendance", labelKey: "nav.attendance", icon: ClipboardCheck },
  { to: "/org/salary-components", labelKey: "nav.payrollComponents", icon: Wallet },
  { to: "/org/payroll", labelKey: "nav.payroll", icon: Wallet },
  { to: "/org/letter-templates", labelKey: "nav.letterTemplates", icon: FileText },
  { to: "/org/hr-letters", labelKey: "nav.hrLetters", icon: FileSignature },
  { to: "/org/support", labelKey: "nav.support", icon: Headset },
  { to: "/payments", labelKey: "nav.payments", icon: CreditCard },
];

/** Platform admin (system) area. */
export const adminNav: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/admin/users", labelKey: "nav.users", icon: Users },
  { to: "/admin/organizations", labelKey: "nav.organizations", icon: Building2 },
  { to: "/admin/requests", labelKey: "nav.verificationRequests", icon: FileCheck2 },
  { to: "/admin/null-requests", labelKey: "nav.unmatchedOrgs", icon: AlertTriangle },
  { to: "/admin/unresponsive", labelKey: "nav.unresponsive", icon: Hourglass },
  { to: "/admin/payments", labelKey: "nav.payments", icon: Wallet },
  { to: "/admin/leads", labelKey: "nav.leads", icon: MessageSquare },
  { to: "/admin/login-history", labelKey: "nav.loginHistory", icon: History },
  { to: "/admin/activity-logs", labelKey: "nav.activityLogs", icon: ScrollText },
  { to: "/admin/support", labelKey: "nav.supportTickets", icon: Headset },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

/** Every path the sidebar can render, for the route-table coverage test. */
export const allNavPaths: string[] = [
  ...new Set(
    [...userNavItems, ...memberNavItems, ...orgAdminNavItems, ...adminNav].map((it) => it.to),
  ),
];
