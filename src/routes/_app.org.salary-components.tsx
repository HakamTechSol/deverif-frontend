import { createFileRoute, redirect } from "@tanstack/react-router";
import { SalaryComponentsManager } from "@/components/salary/SalaryComponentsManager";
import { AccessDenied } from "@/components/common/RequireOrgFeature";
import { usePermissions } from "@/lib/permissions";
import { authStore } from "@/lib/auth";
import { parseFeatureAccess } from "@/lib/utils";

export const Route = createFileRoute("/_app/org/salary-components")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user") throw redirect({ to: "/dashboard" });
    if (user.org_role === "org_admin") return;
    if (user.org_role === "sub_admin" && parseFeatureAccess(user.feature_access).payroll) return;
    throw redirect({ to: "/dashboard" });
  },
  component: OrgSalaryComponentsPage,
});

function OrgSalaryComponentsPage() {
  const perms = usePermissions();
  if (!perms.isOrgAdmin && !perms.payroll) return <AccessDenied feature="payroll" />;
  return <SalaryComponentsManager />;
}
