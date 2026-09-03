import { ShieldX } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/permissions";

export type OrgFeatureKey =
  | "manage_employees"
  | "generate_request"
  | "approve_request"
  | "attendance"
  | "leave"
  | "payroll";

const FEATURE_LABEL: Record<OrgFeatureKey, string> = {
  manage_employees: "Manage Employees",
  generate_request: "Generate Request",
  approve_request: "Approve Request",
  attendance: "Attendance",
  leave: "Leave",
  payroll: "Payroll",
};

/** Renders children only when the current user may access the requested org feature. */
export function RequireOrgFeature({
  feature,
  children,
}: {
  feature: OrgFeatureKey;
  children: React.ReactNode;
}) {
  const perms = usePermissions();
  if (perms.isOrgAdmin || perms[feature]) return <>{children}</>;
  return <AccessDenied feature={feature} />;
}

/** Standalone "no access" fallback for early-return guards inside page components. */
export function AccessDenied({ feature }: { feature: OrgFeatureKey }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Access restricted</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this section
          {` (${FEATURE_LABEL[feature]})`}. Contact your organization administrator if you believe this is a
          mistake.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
