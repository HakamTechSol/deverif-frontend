import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/PageHeader";
import { AutoVerifiedList } from "@/components/common/AutoVerifiedList";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import { authStore } from "@/lib/auth";

export const Route = createFileRoute("/_app/auto-verified")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user" || (user.org_role !== "org_admin" && user.org_role !== "sub_admin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Auto Verified — Dverif" }] }),
  component: AutoVerifiedPage,
});

function AutoVerifiedPage() {
  const { t } = useTranslation();
  const { isLocked } = useOrgSubscription();

  return (
    <div>
      <PageHeader
        title={t("autoVerified.title")}
        description={isLocked ? t("autoVerified.lockedSub") : t("autoVerified.subtitle")}
      />
      {/* The same ledger is also available as the "Auto Approved" tab on the
          inbox page, which is where most people meet it. One component, so the
          two views cannot drift apart. */}
      <AutoVerifiedList />
    </div>
  );
}
