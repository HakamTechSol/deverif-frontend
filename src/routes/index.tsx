import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("dvarif_token");
      throw redirect({ to: token ? "/dashboard" : "/login" });
    }
    throw redirect({ to: "/login" });
  },
});
