import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { authStore } from "@/lib/auth";
import { parseFeatureAccess } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;

    const token = window.localStorage.getItem("Dverif_token");
    if (!token) throw redirect({ to: "/login" });

    const user = authStore.get().user;

    if (location.pathname.startsWith("/admin")) {
      if (!user || user.role !== "admin") throw redirect({ to: "/dashboard" });
    }

    if (location.pathname === "/requests") {
      if (!user || user.role !== "user" || (user.org_role !== "org_admin" && !parseFeatureAccess(user.feature_access).generate_request)) {
        throw redirect({ to: "/dashboard" });
      }
    }

    if (location.pathname === "/payments") {
      if (!user || user.role !== "user" || user.org_role !== "org_admin") {
        throw redirect({ to: "/dashboard" });
      }
    }

    if (location.pathname === "/inbox") {
      if (!user || user.role !== "user" || (user.org_role !== "org_admin" && user.org_role !== "sub_admin")) {
        throw redirect({ to: "/dashboard" });
      }
    }

    if (location.pathname.startsWith("/org/support")) {
      if (!user || user.role !== "user") throw redirect({ to: "/dashboard" });
    }

    if (location.pathname.startsWith("/org/")) {
      if (!user || user.role !== "user" || (user.org_role !== "org_admin" && user.org_role !== "sub_admin")) {
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
