import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Sparkles, Calendar, Clock, ShieldCheck, Building2, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { paymentService, type PlanSummary, type OrgSubscription } from "@/services";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Dvarif" }] }),
  component: PaymentsPage,
});

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Up to 10 verification requests/month",
    "Basic document review",
    "Email notifications",
    "Standard support",
  ],
  basic: [
    "Up to 50 verification requests/month",
    "Priority document review",
    "Email & in-app notifications",
    "Organization branding",
    "CSV export",
    "Priority support",
  ],
  premium: [
    "Unlimited verification requests",
    "Instant document review",
    "All notification channels",
    "Custom organization branding",
    "Advanced analytics & CSV export",
    "Dedicated account manager",
    "API access",
    "SLA guarantee",
  ],
};

function PaymentsPage() {
  const plan = useQuery({ queryKey: ["plan"], queryFn: () => paymentService.plan() });

  const planData = plan.data?.plan as PlanSummary | undefined;
  const orgSub = plan.data?.org_subscription as OrgSubscription | undefined;

  if (plan.isLoading) {
    return (
      <div>
        <PageHeader
          title="Billing & payments"
          description="Manage your plan and purchase upgrades."
        />
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orgSub && orgSub.status === "none") {
    return (
      <div>
        <PageHeader
          title="Billing & payments"
          description="Manage your plan and purchase upgrades."
        />
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No active subscription
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Your organization does not have an active subscription yet.
              All billing is managed by your organization admin. Please
              contact them to set up a plan for your organization.
            </p>
            <Badge variant="outline" className="mt-6 rounded-full">
              <CreditCard className="mr-1 h-3 w-3" /> Organization billing managed by admin
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PlanPage planData={planData} orgSub={orgSub} />
  );
}

function PlanPage({
  planData,
  orgSub,
}: {
  planData: PlanSummary | undefined;
  orgSub: OrgSubscription | undefined;
}) {
  const currentFeatures = PLAN_FEATURES[planData?.code ?? "free"] ?? PLAN_FEATURES.free;
  const isOrgActive = orgSub?.status === "active";

  return (
    <div>
      <PageHeader
        title="Billing & payments"
        description="Manage your plan and purchase upgrades."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main plan card */}
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="rounded-full">
                  <Sparkles className="mr-1 h-3 w-3" /> Current plan
                </Badge>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">
                  {planData?.label ?? "Free"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {planData?.is_active
                    ? "Your plan is active and all features are unlocked."
                    : planData?.status === "expired"
                      ? "Your plan has expired. Renew or upgrade to regain access."
                      : "You're on the free plan. Upgrade for more features."}
                </p>
              </div>
              {planData?.is_active && planData.expires_at ? (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-right">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Expires
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {formatDate(planData.expires_at)}
                  </div>
                </div>
              ) : null}
            </div>

            <Separator className="my-6" />

            {/* Plan features */}
            <div>
              <h3 className="text-sm font-semibold text-foreground">What's included</h3>
              <ul className="mt-3 space-y-2">
                {currentFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-foreground">Plan status</h3>
              <p className="mt-1 text-xs text-muted-foreground">Your subscription details</p>
              <div className="mt-4">
                <div className="text-2xl font-semibold text-foreground capitalize">
                  {planData?.code ?? "free"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {planData?.is_active
                    ? "Active"
                    : planData?.status === "expired"
                      ? "Expired"
                      : "No active subscription"}
                </div>
              </div>

              {/* Active payment status */}
              {isOrgActive && (
                <div className="mt-4 rounded-md border border-success/30 bg-success/5 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold text-success">Active Payment</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your organization has an active subscription
                  </p>
                </div>
              )}

              {planData?.purchased_plan && planData.purchased_plan !== "free" ? (
                <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">Purchased plan</div>
                  <div className="mt-0.5 font-medium text-foreground">{planData.purchased_plan_label}</div>
                </div>
              ) : null}

              {orgSub && orgSub.status !== "none" && (
                <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">Organization plan</div>
                  <div className="mt-0.5 font-medium text-foreground capitalize">
                    {orgSub.plan ?? "—"}
                  </div>
                  {orgSub.expiry && (
                    <div className="mt-0.5 text-muted-foreground">
                      Expires {formatDate(orgSub.expiry)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Billing history</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                All payments are handled manually by your admin. Contact your organization admin for payment details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
