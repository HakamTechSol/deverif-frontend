import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { authStore } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;

    const token = window.localStorage.getItem("dvarif_token");
    if (!token) throw redirect({ to: "/login" });

    if (location.pathname.startsWith("/admin")) {
      const user = authStore.get().user;
      if (!user || user.role !== "admin") throw redirect({ to: "/dashboard" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
