import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SidebarInner } from "@/components/layout/AppShell";
import { personalEssItemsFor, primaryNavItemsFor } from "@/lib/navItems";
import { canAccessRoute } from "@/lib/routeAccess";
import type { AuthUser } from "@/lib/auth";

/**
 * WHAT AN ORG ADMIN ACTUALLY SEES IN THE SIDEBAR.
 *
 * lib/sidebarRoles.test.ts pins which LINKS the composition returns. This file
 * renders the real sidebar and asserts on the DOM, which catches a different
 * class of regression: someone editing AppShell and putting a personal item back
 * into the primary <ul> would leave every composition test green while undoing
 * the whole change. Rendering is the only way to see the actual menu.
 *
 * Assertions are on RENDERED TEXT, following the rule the global test setup
 * spells out: i18next renders a missing key as the raw key string, so asserting
 * on text is what catches a label that was never translated.
 *
 * `Link` is mocked to a plain anchor. SidebarInner is a leaf that only renders
 * navigation, and mounting a real TanStack router to satisfy it would test the
 * router rather than the sidebar.
 */
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => (
    <a href={to} data-testid={`link-${to}`} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

/** The plan context is only used by the upgrade affordance, which these tests avoid. */
vi.mock("@/components/common/PlanPickerProvider", () => ({
  PlanPickerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePlanPicker: () => ({ openPicker: vi.fn() }),
}));

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

/**
 * Render the sidebar the way AppShell does: compose the items, then AND with
 * canAccessRoute exactly as the component does. Duplicating the composition here
 * rather than importing it would hide a bug in the composition itself, so it is
 * imported -- only the access filter, which is the caller's job, is repeated.
 */
function renderSidebarFor(u: AuthUser) {
  const primary = primaryNavItemsFor(u.org_role).filter((it) => canAccessRoute(u, it.to));
  const ess =
    u.role === "admin" ? [] : personalEssItemsFor(u).filter((it) => canAccessRoute(u, it.to));

  return render(
    <SidebarInner
      items={primary}
      personalEssItems={ess}
      pathname="/dashboard"
      onNavigate={() => {}}
      onLogout={() => {}}
      locked={false}
      moduleOffPaths={new Set()}
      blanketLockedPaths={new Set()}
      pathModule={{}}
    />,
  );
}

/** The primary nav is the <nav> element; the footer groups sit outside it. */
function primaryNav() {
  return screen.getByRole("navigation");
}

const ESS_PATHS = ["/requests", "/my-assets", "/my-expenses", "/my-resignation"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the org_admin sidebar renders management modules only", () => {
  it("shows every operational module as a link", () => {
    renderSidebarFor(orgAdmin);
    const nav = primaryNav();
    for (const p of [
      "/org/team",
      "/org/leaves",
      "/org/payroll",
      "/org/expense-claims",
      "/org/assets",
      "/org/offboarding",
      "/org/hr-letters",
    ]) {
      expect(within(nav).getByTestId(`link-${p}`), `${p} not rendered`).toBeInTheDocument();
    }
  });

  it("shows NO personal employee link in the primary nav", () => {
    renderSidebarFor(orgAdmin);
    const nav = primaryNav();
    for (const p of ESS_PATHS) {
      expect(within(nav).queryByTestId(`link-${p}`), `${p} is in the primary nav`).toBeNull();
    }
  });

  it("keeps the approval worklists, which are the job and not personal", () => {
    renderSidebarFor(orgAdmin);
    const nav = primaryNav();
    expect(within(nav).getByTestId("link-/inbox")).toBeInTheDocument();
    expect(within(nav).getByTestId("link-/auto-verified")).toBeInTheDocument();
  });

  it("renders human labels, not raw translation keys", () => {
    renderSidebarFor(orgAdmin);
    // A missing key renders as "nav.expenseClaims" on screen. Asserting on the
    // rendered text is the only way to catch it, and a raw key on the sidebar is
    // the most visible possible translation bug.
    const nav = primaryNav();
    expect(within(nav).getByText("Expense Claims")).toBeInTheDocument();
    expect(within(nav).getByText("Assets")).toBeInTheDocument();
    expect(within(nav).queryByText(/^nav\./)).toBeNull();
  });

  it("offers Personal ESS, collapsed, so the pages stay reachable", () => {
    renderSidebarFor(orgAdmin);
    const toggle = screen.getByRole("button", { name: /personal ess/i });
    expect(toggle).toBeInTheDocument();
    // Collapsed by default, which is the whole point: the personal links must not
    // be in the menu until the user asks for them.
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Personal ESS expands to the caller's own pages", () => {
  it("starts with none of the links rendered", () => {
    renderSidebarFor(orgAdmin);
    for (const p of ESS_PATHS) {
      expect(screen.queryByTestId(`link-${p}`), `${p} rendered while collapsed`).toBeNull();
    }
  });

  it("reveals them on click and marks the group expanded", async () => {
    const user_ = userEvent.setup();
    renderSidebarFor(orgAdmin);

    await user_.click(screen.getByRole("button", { name: /personal ess/i }));

    expect(screen.getByRole("button", { name: /personal ess/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    for (const p of ESS_PATHS) {
      expect(screen.getByTestId(`link-${p}`), `${p} missing after expanding`).toBeInTheDocument();
    }
  });

  it("contains no link the caller would be refused", async () => {
    const user_ = userEvent.setup();
    renderSidebarFor(orgAdmin);
    await user_.click(screen.getByRole("button", { name: /personal ess/i }));

    // /attendance, /my-letters, /payroll and /leaves are roles:["employee"] on the
    // server. A dead link here would read as a broken page.
    for (const dead of ["/attendance", "/my-letters", "/payroll", "/leaves"]) {
      expect(screen.queryByTestId(`link-${dead}`), `${dead} is a dead link`).toBeNull();
    }
  });

  it("keeps the sign-out control, so expanding it never hides it", async () => {
    const user_ = userEvent.setup();
    renderSidebarFor(orgAdmin);
    // nav.signOut is "Logout", not "Sign out" -- asserted by name so the test fails
    // if the label is ever changed without updating the footer too.
    const signOutBefore = screen.getByRole("button", { name: /logout/i });
    expect(signOutBefore).toBeInTheDocument();

    await user_.click(screen.getByRole("button", { name: /personal ess/i }));
    // The group sits ABOVE sign out in the footer, and expanding it must not push
    // the only way out of the app off screen or replace it.
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });
});

describe("an employee sees no management menu and no Personal ESS group", () => {
  it("renders their self-service pages", () => {
    renderSidebarFor(employee);
    const nav = primaryNav();
    for (const p of ["/my-assets", "/my-expenses", "/attendance", "/my-letters", "/payroll"]) {
      expect(
        within(nav).getByTestId(`link-${p}`),
        `${p} missing for an employee`,
      ).toBeInTheDocument();
    }
  });

  it("renders no org module", () => {
    renderSidebarFor(employee);
    const nav = primaryNav();
    for (const p of ["/org/team", "/org/payroll", "/org/assets", "/org/expense-claims"]) {
      expect(within(nav).queryByTestId(`link-${p}`), `${p} leaked to an employee`).toBeNull();
    }
  });

  it("gets NO Personal ESS toggle, because every page is already in its menu", () => {
    renderSidebarFor(employee);
    // Showing a second copy of links they already have would reintroduce exactly the
    // clutter this change removed, in a new place.
    expect(screen.queryByRole("button", { name: /personal ess/i })).toBeNull();
  });
});

describe("a sub_admin sees the same separation as an org_admin", () => {
  it("has no personal link in the primary nav", () => {
    renderSidebarFor(staff);
    const nav = primaryNav();
    for (const p of ESS_PATHS) {
      expect(
        within(nav).queryByTestId(`link-${p}`),
        `${p} in a sub_admin's primary nav`,
      ).toBeNull();
    }
  });

  it("still has the operational modules their permissions cover", () => {
    renderSidebarFor(staff);
    const nav = primaryNav();
    for (const p of ["/org/team", "/org/payroll", "/org/expense-claims", "/org/assets"]) {
      expect(
        within(nav).getByTestId(`link-${p}`),
        `${p} missing for a sub_admin`,
      ).toBeInTheDocument();
    }
    // And not the org_admin-only one, which the guard decides rather than the menu.
    expect(within(nav).queryByTestId("link-/org/admins")).toBeNull();
  });
});
