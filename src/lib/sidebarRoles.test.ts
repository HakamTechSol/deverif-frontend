import { describe, it, expect } from "vitest";

import {
  allNavPaths,
  isStaffOrgRole,
  personalEssItemsFor,
  primaryNavItemsFor,
  memberNavItems,
  orgAdminNavItems,
  userNavItems,
  type NavItem,
} from "@/lib/navItems";
import { canAccessRoute, ROUTE_ACCESS } from "@/lib/routeAccess";
import type { AuthUser } from "@/lib/auth";

/**
 * The sidebar's ROLE SEPARATION, and the line it must not cross.
 *
 * THE BUG THIS EXISTS FOR. An org_admin's primary menu listed their own laptop,
 * their own taxi claims and their own resignation notice at the same weight as
 * Payroll, Asset Categories and the org's expense review queue -- six personal
 * links in a twenty-item management menu, none of which a person running the
 * company opened to do their job. Nothing was broken and nothing was insecure.
 * The menu simply was not doing its one job.
 *
 * THE LINE, STATED ONCE:
 *
 *   audience chooses the MENU.     Presentation. Decided here, in navItems.
 *   canAccessRoute decides ACCESS.  Security. Decided in routeAccess, enforced by
 *                                  the API independently.
 *
 * Everything below follows from that. Narrowing the menu is safe; narrowing
 * access is NOT, and most of these tests exist to prove the change did not quietly
 * become the second thing. The server mounts /my-assets, /my-expenses and
 * /my-resignation behind authUser with NO role check, so an org_admin holding a
 * company laptop genuinely can file for their own taxi. Hiding those pages from
 * them in the client while the server keeps serving them would be the app
 * disagreeing with the API about what is true -- and the "Personal ESS" group
 * exists precisely so the pages stay one click away.
 */

function user(over: Partial<AuthUser> = {}): AuthUser {
  return {
    uuid: "u-1",
    full_name: "Test User",
    email: "t@example.com",
    role: "user",
    organization: 1,
    org_role: "employee",
    feature_access: null,
    ...over,
  };
}

/** Every feature granted, so nothing is hidden by a permission rather than by role. */
const allFeatures = {
  attendance: true,
  leave: true,
  payroll: true,
  manage_employees: true,
  generate_request: true,
  approve_request: true,
};

const orgAdmin = user({ org_role: "org_admin", feature_access: allFeatures });
const staff = user({ org_role: "sub_admin", feature_access: allFeatures });
const employee = user({ org_role: "employee", feature_access: allFeatures });

const paths = (items: NavItem[]) => items.map((i) => i.to);

/**
 * The links the complaint named explicitly. Hardcoded rather than derived from the
 * `audience` field on purpose: the field is what we are testing, so deriving the
 * expectation from it would pass no matter what the field was set to.
 */
const PERSONAL_LINKS = ["/requests", "/my-assets", "/my-expenses", "/my-resignation"];

// ---------------------------------------------------------------------------
// Staff: management only
// ---------------------------------------------------------------------------

describe("staff primary menu is management only", () => {
  it.each([
    ["org_admin", orgAdmin],
    ["sub_admin", staff],
  ])("%s sees no personal employee link", (_role, u) => {
    const shown = paths(primaryNavItemsFor(u.org_role));
    for (const p of PERSONAL_LINKS) {
      expect(shown, `${p} is still in the management menu`).not.toContain(p);
    }
  });

  it.each([
    ["org_admin", orgAdmin],
    ["sub_admin", staff],
  ])("%s still sees every operational module", (_role, u) => {
    const shown = paths(primaryNavItemsFor(u.org_role));
    // The modules that ARE the job. Each is a management surface, so losing one
    // here would be a regression far worse than the clutter we removed.
    for (const p of [
      "/dashboard",
      "/org/team",
      "/org/admins",
      "/org/leaves",
      "/org/attendance",
      "/org/salary-components",
      "/org/payroll",
      "/org/expense-claims",
      "/org/asset-categories",
      "/org/assets",
      "/org/offboarding",
      "/org/hr-letters",
      "/org/letter-templates",
      "/org/support",
      "/payments",
      "/settings",
    ]) {
      expect(shown, `${p} vanished from the staff menu`).toContain(p);
    }
  });

  it("keeps the approval worklists, which are staff work and not employee work", () => {
    const shown = paths(primaryNavItemsFor("org_admin"));
    // The distinction that matters: /requests is "my own request" and is personal,
    // while /inbox and /auto-verified are other people's requests waiting on this
    // user, which is the job.
    expect(shown).toContain("/inbox");
    expect(shown).toContain("/auto-verified");
    expect(shown).not.toContain("/requests");
  });

  it("puts the management modules in a sensible order, payroll before expenses", () => {
    const shown = paths(primaryNavItemsFor("org_admin"));
    // Money ops read in this order: payroll decides what is paid, expenses are
    // what gets reimbursed on top, assets is what was bought.
    expect(shown.indexOf("/org/payroll")).toBeLessThan(shown.indexOf("/org/expense-claims"));
    expect(shown.indexOf("/org/expense-claims")).toBeLessThan(shown.indexOf("/org/assets"));
    expect(shown.indexOf("/org/assets")).toBeLessThan(shown.indexOf("/org/offboarding"));
  });
});

// ---------------------------------------------------------------------------
// Employee: self-service only
// ---------------------------------------------------------------------------

describe("employee menu is self-service only", () => {
  it("shows the employee pages and none of the org ones", () => {
    const shown = paths(primaryNavItemsFor("employee"));
    for (const p of [
      "/my-assets",
      "/my-expenses",
      "/my-resignation",
      "/requests",
      "/attendance",
      "/my-letters",
      "/payroll",
    ]) {
      expect(shown, `${p} missing from the employee menu`).toContain(p);
    }
    for (const p of orgAdminNavItems.map((i) => i.to)) {
      expect(shown, `${p} leaked into the employee menu`).not.toContain(p);
    }
  });

  it("still gets the dashboard, because it is their landing page", () => {
    expect(paths(primaryNavItemsFor("employee"))).toContain("/dashboard");
  });

  it("still gets Settings, which ROUTE_ACCESS opens to every org role", () => {
    // The trap in tagging everything: Settings had no audience, so forcing it into
    // one would have silently removed it for one of the two roles.
    expect(paths(primaryNavItemsFor("employee"))).toContain("/settings");
    expect(paths(primaryNavItemsFor("org_admin"))).toContain("/settings");
  });

  it("shows no employee the org approval worklists", () => {
    // Already refused by canAccessRoute (roles: STAFF_ROLES / feature-gated), and
    // the audience split now keeps them out of the menu a second time.
    const shown = paths(primaryNavItemsFor("employee"));
    expect(shown).not.toContain("/inbox");
    expect(shown).not.toContain("/auto-verified");
  });
});

// ---------------------------------------------------------------------------
// The escape hatch, and the line it must not cross
// ---------------------------------------------------------------------------

describe("staff keep their own employee pages, one click away", () => {
  it.each([
    ["org_admin", orgAdmin],
    ["sub_admin", staff],
  ])("%s gets a Personal ESS group", (_label, u) => {
    expect(paths(personalEssItemsFor(u))).toEqual([
      "/requests",
      "/my-assets",
      "/my-expenses",
      "/my-resignation",
    ]);
  });

  it("an employee gets no group, because they already have these in their menu", () => {
    // Showing the same links twice would reintroduce exactly the clutter this
    // change removed, in a second place.
    expect(personalEssItemsFor(employee)).toEqual([]);
  });

  it("offers nothing to a platform admin, who has no employee record", () => {
    expect(personalEssItemsFor(null)).toEqual([]);
    expect(personalEssItemsFor(undefined)).toEqual([]);
    expect(personalEssItemsFor(user({ role: "admin", org_role: undefined }))).toEqual([]);
  });

  it("offers nothing to a staff member who lacks the feature /requests needs", () => {
    // /requests is feature-gated on generate_request, unlike the other three which
    // are unconditional. A sub-admin without it must not get a link to a page the
    // guard will bounce.
    const noFeature = user({
      org_role: "sub_admin",
      feature_access: { ...allFeatures, generate_request: false },
    });
    expect(paths(personalEssItemsFor(noFeature))).not.toContain("/requests");
    expect(paths(personalEssItemsFor(noFeature))).toContain("/my-expenses");
  });

  it("offers nothing this staff member would be refused", () => {
    // /attendance, /my-letters, /payroll and /leaves are roles:["employee"], so a
    // staff member is refused all four. Listing them would put dead links in the
    // sidebar, and the failure mode of a dead link is that people conclude the page
    // is broken.
    for (const it of personalEssItemsFor(orgAdmin)) {
      expect(canAccessRoute(orgAdmin, it.to), `${it.to} would be refused`).toBe(true);
    }
    for (const dead of ["/attendance", "/my-letters", "/payroll", "/leaves"]) {
      expect(paths(personalEssItemsFor(orgAdmin)), `${dead} is a dead link`).not.toContain(dead);
    }
  });

  it("every group link is genuinely reachable, so this is convenience and not a restriction", () => {
    // THE load-bearing assertion. If narrowing the menu had become narrowing
    // access, an org_admin could no longer file their own expense claim -- while
    // the server, which checks nothing about roles on that route, would still have
    // said yes.
    for (const p of ["/my-assets", "/my-expenses", "/my-resignation", "/requests"]) {
      expect(canAccessRoute(orgAdmin, p), `org_admin lost access to ${p}`).toBe(true);
      expect(canAccessRoute(staff, p), `sub_admin lost access to ${p}`).toBe(true);
    }
  });

  it("ROUTE_ACCESS itself is untouched by this change", () => {
    // Pinned because the tempting shortcut -- "just deny staff in ROUTE_ACCESS" --
    // would satisfy every nav test above and still be wrong. The guard table must
    // keep answering from the SERVER's rules.
    for (const p of ["/my-expenses", "/my-assets", "/my-resignation"]) {
      expect(ROUTE_ACCESS[p].roles, `${p} lost staff access`).toEqual(
        expect.arrayContaining(["org_admin", "sub_admin", "employee"]),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// No link was dropped from the product
// ---------------------------------------------------------------------------

describe("separation hides, it does not delete", () => {
  it("every nav path is either reachable from a menu or refused by the guard", () => {
    // The union of a staff member's two menus, plus the employee menu, must cover
    // every nav path. The alternative reading -- "staff must reach everything" -- is
    // wrong: /leaves is employee-only on the server, so a staff member is CORRECTLY
    // unable to open it and no menu should pretend otherwise. What must never happen
    // is a path that is reachable but appears in neither menu: the page would work
    // by URL and simply be unfindable.
    const staffReach = new Set([
      ...paths(primaryNavItemsFor("org_admin")),
      ...paths(personalEssItemsFor(orgAdmin)),
    ]);
    const employeeReach = new Set(paths(primaryNavItemsFor("employee")));
    const unreachable = allNavPaths.filter(
      (p) =>
        !p.startsWith("/admin") &&
        !staffReach.has(p) &&
        !employeeReach.has(p) &&
        canAccessRoute(orgAdmin, p) &&
        canAccessRoute(employee, p),
    );
    expect(unreachable, `reachable by guard but in no menu: ${unreachable.join(", ")}`).toEqual([]);
  });

  it("an employee's single menu still covers every self-service path they can open", () => {
    const shown = new Set(paths(primaryNavItemsFor("employee")));
    const selfService = [...userNavItems, ...memberNavItems]
      .filter((i) => i.audience === "self-service")
      .map((i) => i.to);
    expect(selfService.length).toBeGreaterThan(0);
    for (const p of selfService) {
      // canAccessRoute is the reference here, because an employee is refused the
      // feature-gated ones (/requests without generate_request) and asserting them
      // unconditionally would describe a user the product does not have.
      if (canAccessRoute(employee, p)) {
        expect(shown.has(p), `${p} missing for an employee`).toBe(true);
      }
    }
  });

  it("isStaffOrgRole treats only the two staff roles as staff", () => {
    expect(isStaffOrgRole("org_admin")).toBe(true);
    expect(isStaffOrgRole("sub_admin")).toBe(true);
    expect(isStaffOrgRole("employee")).toBe(false);
    expect(isStaffOrgRole(undefined)).toBe(false);
    expect(isStaffOrgRole(null)).toBe(false);
  });

  it("an item with no audience is management, so a new module defaults sensibly", () => {
    // The default is the safe one: a newly added operational page appearing in the
    // staff menu is correct, and appearing in an employee's menu would be a leak.
    // /dashboard is excluded because it is deliberately cross-cutting.
    const untagged = [...userNavItems, ...memberNavItems, ...orgAdminNavItems].filter(
      (i) => i.audience === undefined && i.to !== "/dashboard",
    );
    expect(untagged.length).toBeGreaterThan(0);
    const shown = new Set(paths(primaryNavItemsFor("employee")));
    for (const it of untagged) {
      expect(shown.has(it.to), `untagged ${it.to} leaked into the employee menu`).toBe(false);
      expect(paths(primaryNavItemsFor("org_admin"))).toContain(it.to);
    }
  });

  it("orgAdminNavItems carries no self-service item by accident", () => {
    for (const it of orgAdminNavItems) {
      expect(it.audience, `${it.to} is tagged self-service inside the org list`).toBeUndefined();
    }
  });
});
