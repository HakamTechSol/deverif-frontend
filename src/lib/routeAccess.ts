import type { AuthUser } from "@/lib/auth";
import { parseFeatureAccess } from "@/lib/utils";

/**
 * THE single source of truth for "may this user open this page?".
 *
 * Before this module the answer lived in two places that were written by hand
 * and had drifted apart:
 *
 *   - AppShell.tsx decided which sidebar links to render,
 *   - a stack of `if (location.pathname...)` blocks in _app.tsx plus a
 *     `beforeLoad` on each individual route file decided what to redirect to.
 *
 * Nothing tied the two together, so a link could be rendered for a user the
 * guards then bounced. Employee + Support was one instance (and the guards
 * there actively contradicted each other -- see below); /inbox and
 * /auto-verified were two more.
 *
 * Both the sidebar and every route guard now call canAccessRoute(). A
 * visible-but-dead link is no longer expressible: if the sidebar shows an item,
 * the guard that guards it consulted the same row of the same table.
 *
 * This governs CLIENT-side navigation only. It is a UX affordance, never a
 * security control -- every one of these pages is independently enforced by the
 * API's own requireRole()/requirePermission() checks, which are unchanged.
 */

export type OrgRole = "org_admin" | "sub_admin" | "employee";

/** The feature_access keys, as persisted per user. Mirrors the backend's PERMISSION_KEYS. */
export type FeatureKey =
  "attendance" | "leave" | "payroll" | "manage_employees" | "generate_request" | "approve_request";

const ALL_ORG_ROLES: readonly OrgRole[] = ["org_admin", "sub_admin", "employee"];
const STAFF_ROLES: readonly OrgRole[] = ["org_admin", "sub_admin"];

export type RouteRule = {
  /** org_roles that may open the page. Platform admins are handled separately. */
  roles: readonly OrgRole[];
  /**
   * feature_access key that additionally opens the page to a role in `roles`.
   * Omit for pages that are purely role-gated.
   */
  feature?: FeatureKey;
  /**
   * Roles that pass without holding `feature`. org_admin is the only role that
   * appears here, and only where the backend treats it as unconditionally
   * entitled.
   */
  always?: readonly OrgRole[];
};

/**
 * One row per navigable page.
 *
 * The `roles` lists below mirror the backend's middleware, which is the real
 * authority:
 *   - `/org/*` operational pages -> requireRole("org_admin", "sub_admin")
 *   - `/org/support`             -> requireRole("org_admin", "sub_admin", "employee")
 *   - `/leaves`, `/attendance`, `/payroll` -> requireRole("employee")
 *   - `/requests` and the inbox   -> requirePermission(generate_request / approve_request)
 * Note the two axes are independent: `roles` is who may enter at all, `feature`
 * is what a non-privileged role must additionally be granted.
 *
 * Plan-level modules (subscription_plans.module_flags: payroll_management,
 * employee_management, ...) are deliberately NOT here. That is a separate axis
 * keyed on the org's plan, not the user's role or feature_access, and it is
 * already surfaced as the "upgrade to unlock" affordance in the sidebar.
 */
export const ROUTE_ACCESS: Readonly<Record<string, RouteRule>> = {
  "/dashboard": { roles: ALL_ORG_ROLES },
  "/settings": { roles: ALL_ORG_ROLES },

  // --- Verification product -------------------------------------------------
  "/requests": { roles: ALL_ORG_ROLES, feature: "generate_request", always: ["org_admin"] },
  "/inbox": { roles: ALL_ORG_ROLES, feature: "approve_request", always: ["org_admin"] },
  "/auto-verified": { roles: ALL_ORG_ROLES, feature: "approve_request", always: ["org_admin"] },

  // --- Self-service: employees only ----------------------------------------
  // The API mounts these three behind requireRole("employee"), so staff must
  // never reach them even though the backend is happy to *read* for them.
  "/leaves": { roles: ["employee"], feature: "leave" },
  "/attendance": { roles: ["employee"], feature: "attendance" },
  "/payroll": { roles: ["employee"], feature: "payroll" },
  // Employee self-service. No feature_access key: letters are not delegable to
  // sub-admins via feature_access (see the /org/hr-letters note), and the
  // employee who receives a letter is not a delegated approver of anything.
  // Plan-level access is handled by ModuleGate via module_flags.
  "/my-letters": { roles: ["employee"] },

  // --- Org operations: staff only ------------------------------------------
  "/org/support": { roles: STAFF_ROLES },
  "/org/team": { roles: STAFF_ROLES, feature: "manage_employees", always: ["org_admin"] },
  "/org/admins": { roles: ["org_admin"] },
  "/org/leaves": { roles: STAFF_ROLES, feature: "leave", always: ["org_admin"] },
  "/org/attendance": { roles: STAFF_ROLES, feature: "attendance", always: ["org_admin"] },
  "/org/salary-components": { roles: STAFF_ROLES, feature: "payroll", always: ["org_admin"] },
  "/org/payroll": { roles: STAFF_ROLES, feature: "payroll", always: ["org_admin"] },

  // --- HR letters ------------------------------------------------------------
  // Gated on ROLE only, not on a feature_access key. Letters are not delegated
  // to sub-admins via feature_access: issuing an experience or increment letter
  // is an act of the organization, and sub-admin delegation for it would mean
  // granting a sub-admin the power to attest to someone's employment to a third
  // party. Plan-level access is the separate axis handled by ModuleGate via
  // module_flags (hr_letters_management) â€” deliberately not a column here, for
  // the same reason the other plan modules are not.
  "/org/letter-templates": { roles: ["org_admin"] },
  "/org/hr-letters": { roles: ["org_admin"] },

  // --- Billing --------------------------------------------------------------
  // The org can *read* subscription status as any role, but every mutating
  // action on this page (checkout, self-subscribe, cancel downgrade) is
  // org_admin-only server-side, so the page as a whole is org_admin.
  "/payments": { roles: ["org_admin"] },
  // Where the provider sends the browser back to after a checkout. Only an
  // org_admin can start a checkout in the first place, and this page links
  // straight back to /payments.
  "/payment/callback": { roles: ["org_admin"] },
};

/**
 * Platform-admin pages. Not part of ROUTE_ACCESS because a platform admin is
 * not an org user at all: they get their own /admin/* area, and are explicitly
 * barred server-side from every org-scoped module.
 */
const PLATFORM_ADMIN_PREFIX = "/admin";
const PLATFORM_ADMIN_EXACT = new Set(["/dashboard", "/settings"]);

/** Normalise a path: strip a trailing slash and any query/hash. */
function normalize(path: string): string {
  const withoutQuery = path.split(/[?#]/)[0] ?? "";
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Find the rule for a path, walking up the segments so that a detail route
 * inherits its list route's rule -- /org/team/<uuid> is governed by the
 * "/org/team" row, and there is no second row to forget to update.
 */
function ruleForPath(path: string): RouteRule | null {
  let current = normalize(path);
  for (;;) {
    const rule = ROUTE_ACCESS[current];
    if (rule) return rule;
    const slash = current.lastIndexOf("/");
    if (slash <= 0) return null;
    current = current.slice(0, slash);
  }
}

/**
 * May `user` open `path`?
 *
 * Fails closed: an authenticated org user hitting a path with no row in
 * ROUTE_ACCESS is denied, so adding a page without deciding who may see it
 * fails visibly rather than defaulting to open.
 */
export function canAccessRoute(user: AuthUser | null | undefined, path: string): boolean {
  if (!user) return false;

  const p = normalize(path);

  if (user.role === "admin") {
    return (
      p === PLATFORM_ADMIN_PREFIX ||
      p.startsWith(`${PLATFORM_ADMIN_PREFIX}/`) ||
      PLATFORM_ADMIN_EXACT.has(p)
    );
  }

  // An org user must have a resolved org_role; anything else cannot be
  // evaluated against a role list, so it is denied.
  const orgRole = user.org_role;
  if (orgRole !== "org_admin" && orgRole !== "sub_admin" && orgRole !== "employee") {
    return false;
  }

  const rule = ruleForPath(p);
  if (!rule) return false;
  if (!rule.roles.includes(orgRole)) return false;

  if (!rule.feature) return true;
  if (rule.always?.includes(orgRole)) return true;

  return parseFeatureAccess(user.feature_access)[rule.feature];
}

/**
 * Every path in ROUTE_ACCESS, for tests and for asserting the sidebar and the
 * guards cannot drift apart.
 */
export function allKnownRoutes(): string[] {
  return Object.keys(ROUTE_ACCESS);
}
