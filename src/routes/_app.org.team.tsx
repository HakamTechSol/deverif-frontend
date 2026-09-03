import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { authStore } from "@/lib/auth";
import { parseFeatureAccess } from "@/lib/utils";

export const Route = createFileRoute("/_app/org/team")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user") throw redirect({ to: "/dashboard" });
    if (user.org_role === "org_admin") return;
    if (user.org_role === "sub_admin" && parseFeatureAccess(user.feature_access).manage_employees) return;
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "My Team — Dvarif" }] }),
  component: () => <Outlet />,
});
