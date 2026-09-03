import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { authStore } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { type SupportTicket } from "@/services";

export const Route = createFileRoute("/_app/org/support")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Support — Dvarif" }] }),
  component: () => <Outlet />,
});

export function PriorityBadge({ priority }: { priority: SupportTicket["priority"] }) {
  const { t } = useTranslation();
  const color =
    priority === "high"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : priority === "medium"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-success/30 bg-success/10 text-success";
  return (
    <Badge variant="outline" className={`rounded-full capitalize ${color}`}>
      {t(`supportTickets.${priority}`)}
    </Badge>
  );
}
