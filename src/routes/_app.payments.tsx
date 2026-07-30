import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Calendar, CheckCircle2, Building2, Wallet } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paymentService, type PlanSummary, type OrgSubscription, type Payment } from "@/services";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Dvarif" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const plan = useQuery({ queryKey: ["plan"], queryFn: () => paymentService.plan() });

  const planData = plan.data?.plan as PlanSummary | undefined;
  const orgSub = plan.data?.org_subscription as OrgSubscription | undefined;
  const payments = plan.data?.payments as Payment[] | undefined;

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

  return <PlanPage planData={planData} orgSub={orgSub} payments={payments ?? []} />;
}

function PlanPage({
  planData,
  orgSub,
  payments,
}: {
  planData: PlanSummary | undefined;
  orgSub: OrgSubscription | undefined;
  payments: Payment[];
}) {
  const isOrgActive = orgSub?.status === "active";

  return (
    <div>
      <PageHeader
        title="Billing & payments"
        description="Manage your plan and purchase upgrades."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription details */}
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Subscription details</h3>
            </div>

            {isOrgActive && orgSub ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-success/30 bg-success/5 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold text-success">Active Subscription</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your organization has an active subscription
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                    <div className="text-muted-foreground">Plan</div>
                    <div className="mt-0.5 text-sm font-medium text-foreground capitalize">
                      {orgSub.plan ?? "—"}
                    </div>
                  </div>
                  {orgSub.start && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <div className="text-muted-foreground">Started</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        {formatDate(orgSub.start)}
                      </div>
                    </div>
                  )}
                  {orgSub.expiry && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <div className="text-muted-foreground">Expires</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        {formatDate(orgSub.expiry)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="rounded-md border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active subscription. Contact your admin to get started.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing history */}
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border p-6">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Billing history</h3>
            </div>
            {payments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Wallet}
                  title="No billing history yet"
                  description="Payments will appear here once your organization processes them."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.uuid}>
                        <TableCell className="font-mono text-xs">{p.transaction_reference}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full capitalize">
                            {p.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.purpose}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.paid_at ?? p.created_at)}
                        </TableCell>
                        <TableCell className="text-right font-medium">Rs. {p.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
