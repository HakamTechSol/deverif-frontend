import type { LucideIcon } from "lucide-react";
import { canAccessRoute, type OrgRole } from "@/lib/routeAccess";
import type { AuthUser } from "@/lib/auth";
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
  FolderTree,
  Headset,
  History,
  Hourglass,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Receipt,
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
 * MAY this user open the page? That is decided SOLELY by canAccessRoute().
 *
 * SHOULD the page be one click away? That is the separate question this module's
 * `audience` field answers, and the two must not be confused -- see the note on
 * NavAudience below for why they came apart and why both still exist.
 */

/**
 * Which sidebar a link belongs in.
 *
 *  - "management" (the default when omitted) — operational work: payroll, assets,
 *    leave approvals, expense review. These belong in the primary sidebar for
 *    staff, because they are the job.
 *  - "self-service" — an employee acting as an employee: my payslips, my assets,
 *    my expenses, my resignation.
 *
 * WHY A SECOND AXIS AT ALL, GIVEN canAccessRoute ALREADY EXISTS.
 *
 * canAccessRoute answers a permission question. The complaint that prompted this
 * field was not that staff COULD open /my-expenses -- they must, the server mounts
 * it for every org user and denies nothing -- but that it sat in the middle of a
 * manager's primary menu beside Payroll and Asset Categories, among twenty
 * operational links, six of which are the employee acting for themselves. A
 * sub-admin running the company saw their own laptop and their own taxi receipt
 * filed at the same visual weight as the org's expense queue. Nothing was broken;
 * the menu was just not doing its one job.
 *
 * SO: audience NEVER removes access. Every self-service link stays in ROUTE_ACCESS
 * with whatever roles it had, and staff keep reaching them through the
 * "Personal ESS" affordance in the sidebar footer. Narrowing the PRIMARY menu is
 * a presentation decision; locking the page would be a security decision, and
 * that belongs to the server, which already made it.
 *
 * Marking something "self-service" is therefore always SAFE. Marking something
 * "management" is NOT free: it will appear for every staff member whose plan
 * includes its module, so only operational pages belong there.
 */
export type NavAudience = "management" | "self-service";

export type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Omitted means "management". See NavAudience. */
  audience?: NavAudience;
  badge?: number;
};

/** Shared by org users of every role. */
export const userNavItems: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  // Self-service: this is the employee raising a request of their own, not the
  // approval queue (that is /inbox). It is ALL_ORG_ROLES in ROUTE_ACCESS because a
  // sub-admin raises verification requests too, so it is reachable for them --
  // just not from the middle of their management menu.
  { to: "/requests", labelKey: "nav.myRequests", icon: Send, audience: "self-service" },
  { to: "/leaves", labelKey: "nav.leaves", icon: CalendarDays, audience: "self-service" },
  // /inbox and /auto-verified are APPROVAL worklists. They stay management: a
  // reviewer opening their sidebar wants the queue first.
  { to: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { to: "/auto-verified", labelKey: "nav.autoVerified", icon: BadgeCheck },
];

/** Employee self-service. Staff reach these through the Personal ESS footer group. */
export const memberNavItems: NavItem[] = [
  { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardCheck, audience: "self-service" },
  { to: "/my-letters", labelKey: "nav.myLetters", icon: FileSignature, audience: "self-service" },
  // Self-service, and NOT shown in a staff member's primary menu even though
  // ROUTE_ACCESS opens it to every org role: a sub-admin who is also on the roster
  // really is holding a company laptop and really can file for their own taxi.
  // They reach both through "Personal ESS" rather than having them crowd the
  // modules they administer.
  { to: "/my-assets", labelKey: "nav.myAssets", icon: Package, audience: "self-service" },
  { to: "/my-expenses", labelKey: "nav.myExpenses", icon: Receipt, audience: "self-service" },
  { to: "/payroll", labelKey: "nav.payroll", icon: Wallet, audience: "self-service" },
  { to: "/my-resignation", labelKey: "nav.myResignation", icon: LogOut, audience: "self-service" },
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
  // Expense claims sit after payroll and before assets, because the money ops
  // read in that order: payroll decides what is paid, expense claims are what
  // reimburses on top of it, and assets is the register of what was bought.
  { to: "/org/expense-claims", labelKey: "nav.expenseClaims", icon: Receipt },
  // Asset categories sit before inventory because they are the filter the
  // inventory is read through, and because only an org_admin sees the first one.
  { to: "/org/asset-categories", labelKey: "nav.assetCategories", icon: FolderTree },
  { to: "/org/assets", labelKey: "nav.assets", icon: Package },
  // Offboarding sits after payroll because the FnF settlement is where the two
  // meet, and next to assets because the clearance checklist is what stands
  // between a departure and the company getting its laptop back.
  { to: "/org/offboarding", labelKey: "nav.offboarding", icon: LogOut },
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

/** The org roles that count as "runs the organization". Mirrors routeAccess. */
const STAFF_ORG_ROLES: readonly OrgRole[] = ["org_admin", "sub_admin"];

export function isStaffOrgRole(orgRole: OrgRole | undefined | null): boolean {
  return !!orgRole && STAFF_ORG_ROLES.includes(orgRole);
}

/**
 * Pages that belong to BOTH menus.
 *
 * A dashboard is an employee's landing page and a manager's alike, and Settings
 * is the profile/config page for every org user (ROUTE_ACCESS opens it to all
 * three roles). Tagging them one way would have silently removed a page somebody
 * relies on, so they are named here instead of being forced into an audience.
 */
const CROSS_CUTTING_PATHS = new Set(["/dashboard", "/settings"]);

/**
 * The PRIMARY sidebar menu for an org user, before access filtering.
 *
 * Staff get management modules only; an employee gets self-service plus the
 * cross-cutting items. This is only the raw list -- AppShell still ANDs it with
 * canAccessRoute() per item, which is what removes anything the user's plan or
 * permissions do not cover.
 *
 * Returned as a function rather than a constant because the previous design merged
 * the four exported arrays inside AppShell, which put the role decision in the
 * component where it could not be tested without rendering the whole shell.
 */
export function primaryNavItemsFor(orgRole: OrgRole | undefined | null): NavItem[] {
  const staff = isStaffOrgRole(orgRole);
  const all = [
    ...userNavItems,
    ...memberNavItems,
    ...orgAdminNavItems,
    // Settings is not in any list above (adminNav carries its own copy for the
    // platform area) but every org user needs it, so it is appended here rather
    // than hard-coded in the component.
    { to: "/settings", labelKey: "nav.settings", icon: Settings },
  ];

  return all.filter((it) => {
    if (CROSS_CUTTING_PATHS.has(it.to)) return true;
    const audience = it.audience ?? "management";
    return staff ? audience === "management" : audience === "self-service";
  });
}

/**
 * The self-service links a STAFF member keeps a route to, for the sidebar's
 * "Personal ESS" group.
 *
 * Empty for an employee -- they already have all of these in their primary menu,
 * and showing them twice would be the same clutter this group exists to fix.
 *
 * These are NOT extra permissions. Every path here is already in ROUTE_ACCESS for
 * every org role; the group only makes an already-granted page findable. It is
 * deliberately NOT filtered by canAccessRoute here: the caller does that, so a
 * plan that excludes a module hides the link here exactly as it does in the
 * primary menu rather than showing a disabled row.
 */
/**
 * The self-service links a STAFF member actually has a route to, for the sidebar's
 * "Personal ESS" group.
 *
 * Empty for an employee -- they already have all of these in their primary menu,
 * and showing them twice would be the same clutter this group exists to fix.
 *
 * FILTERED BY canAccessRoute, AND THAT IS THE POINT OF TAKING THE USER RATHER THAN
 * THE ROLE. Most self-service pages are `roles: ["employee"]` in ROUTE_ACCESS --
 * /attendance, /my-letters, /payroll and /leaves all are -- so a staff member is
 * refused every one of them. Listing them here anyway would put dead links in the
 * sidebar, and the failure mode of a dead link is that people conclude the page is
 * broken. The group's entire purpose is "your own pages, one click away", and a
 * page you cannot open is not that.
 *
 * Filtering here rather than trusting the caller to filter afterwards is
 * deliberate: AppShell does also AND this with canAccessRoute, so the rendered
 * result is the same either way, but a function that returns only usable links is
 * correct on its own and testable without rendering the shell.
 *
 * What survives for a staff member, and why each is genuinely theirs:
 *   /requests       the employee's own verification request, not the queue
 *   /my-assets      a laptop they are personally holding
 *   /my-expenses    a taxi they spent their own money on
 *   /my-resignation notice they are entitled to serve as an employee
 *
 * Every one of these is ALL_ORG_ROLES in ROUTE_ACCESS, because the backend mounts
 * them with authUser and no role check. This group therefore grants NOTHING: it
 * only keeps an already-granted page findable.
 */
export function personalEssItemsFor(user: AuthUser | null | undefined): NavItem[] {
  if (!user || !isStaffOrgRole(user.org_role)) return [];
  return [...userNavItems, ...memberNavItems].filter(
    (it) => it.audience === "self-service" && canAccessRoute(user, it.to),
  );
}
