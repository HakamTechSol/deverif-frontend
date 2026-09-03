import { useAuth, type AuthUser } from "@/lib/auth";
import type { FeatureAccessKey } from "@/services";
import { parseFeatureAccess } from "@/lib/utils";

export type Role = "org_admin" | "sub_admin" | "employee";

/** True when the user is a platform admin (system-level) account. */
export function isPlatformAdmin(user?: AuthUser | null): boolean {
  return !!user && user.role === "admin";
}

/** True when the user is an organization admin (full control). */
export function isOrgAdmin(user?: AuthUser | null): boolean {
  return !!user && user.role === "user" && user.org_role === "org_admin";
}

/** True when the user is a sub-admin (operational staff access). */
export function isSubAdmin(user?: AuthUser | null): boolean {
  return !!user && user.role === "user" && user.org_role === "sub_admin";
}

/** True when the user is an ordinary employee (self-service only). */
export function isEmployee(user?: AuthUser | null): boolean {
  return !!user && user.role === "user" && user.org_role === "employee";
}

/** Staff = org_admin + sub_admin (share all operational management access). */
export function isStaff(user?: AuthUser | null): boolean {
  return isOrgAdmin(user) || isSubAdmin(user);
}

/**
 * Role-based access for the org workspace.
 * - org_admin: full control (including deletes + sub-admin mgmt + org settings)
 * - sub_admin: operations access (no deletes, no sub-admin mgmt, no org settings)
 * - employee: self-service only
 */
const SUB_ADMIN_FORBIDDEN = new Set<string>([
  "org.admins",
  "org.settings",
]);

/** Whether the given org nav/page key is reachable by the user's role. */
export function canAccessPage(user: AuthUser | null | undefined, pageKey: string): boolean {
  if (!user || isPlatformAdmin(user)) return false;
  const staffOnly = pageKey.startsWith("org.");
  if (!staffOnly) return true;
  if (isOrgAdmin(user)) return true;
  if (isSubAdmin(user)) return !SUB_ADMIN_FORBIDDEN.has(pageKey);
  return false;
}

/** True when the user has full staff (org_admin or sub_admin) power. */
export function can(user: AuthUser | null | undefined): boolean {
  return isStaff(user);
}

export function useRoles() {
  const { user } = useAuth();
  return {
    isPlatformAdmin: isPlatformAdmin(user),
    isOrgAdmin: isOrgAdmin(user),
    isSubAdmin: isSubAdmin(user),
    isEmployee: isEmployee(user),
    isStaff: isStaff(user),
  };
}

/** Verification-product access: org_admin gets full access; sub_admin and employee rely on feature_access. */
export function usePermissions() {
  const { user } = useAuth();
  const isOrgAdminUser = isOrgAdmin(user);
  const fa = parseFeatureAccess(user?.feature_access);
  return {
    attendance: isOrgAdminUser || fa.attendance,
    leave: isOrgAdminUser || fa.leave,
    payroll: isOrgAdminUser || fa.payroll,
    manage_employees: isOrgAdminUser || fa.manage_employees,
    generate_request: isOrgAdminUser || fa.generate_request,
    approve_request: isOrgAdminUser || fa.approve_request,
    isOrgAdmin: isOrgAdminUser,
    isSubAdmin: isSubAdmin(user),
    isEmployee: isEmployee(user),
  };
}
