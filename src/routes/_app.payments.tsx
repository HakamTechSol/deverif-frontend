import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Calendar, CheckCircle2, Building2, Wallet, Gauge, Sparkles, Send, Info, Check, RefreshCw, Clock, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DvarifLoader } from "@/components/common/DvarifLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { QuotaRing } from "@/components/common/QuotaRing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  paymentService,
  orgSubscriptionService,
  marketingService,
  type PlanSummary,
  type OrgSubscription,
  type Payment,
  type QuotaStatus,
  type CustomPlanRequest,
  type SubscriptionPlan,
  type UUID,
} from "@/services";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Dvarif" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { t } = useTranslation();
  const plan = useQuery({ queryKey: ["plan"], queryFn: () => paymentService.plan() });

  const planData = plan.data?.plan as PlanSummary | undefined;
  const orgSub = plan.data?.org_subscription as OrgSubscription | undefined;
  const quotaStatus = plan.data?.quota_status as QuotaStatus | undefined;
  const payments = plan.data?.payments as Payment[] | undefined;

  if (plan.isLoading) {
    return (
      <div>
        <PageHeader
          title={t("payments.title")}
          description={t("payments.description")}
        />
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 py-16"
        >
          <DvarifLoader size="md" />
          <p className="text-sm text-muted-foreground">{t("payments.loading")}</p>
        </div>
      </div>
    );
  }

  if (orgSub && (orgSub.status === "none" || orgSub.status === "expired")) {
    return <SubscribeSection status={orgSub.status} planData={planData} orgSub={orgSub} payments={payments ?? []} />;
  }

  if (orgSub && orgSub.status === "pending_payment") {
    return <PendingSection planData={planData} orgSub={orgSub} payments={payments ?? []} />;
  }

  return <PlanPage planData={planData} orgSub={orgSub} quotaStatus={quotaStatus} payments={payments ?? []} />;
}

/* ─────────── Subscribe (no active subscription: none/expired) ─────────── */
function SubscribeSection({
  status,
  planData,
  orgSub,
  payments,
}: {
  status: "none" | "expired";
  planData: PlanSummary | undefined;
  orgSub: OrgSubscription | undefined;
  payments: Payment[];
}) {
  const { t } = useTranslation();

  const plans = useQuery({
    queryKey: ["org-public-plans"],
    queryFn: () => marketingService.listPlans(),
  });

  const [confirmPlan, setConfirmPlan] = useState<SubscriptionPlan | null>(null);

  const checkout = useMutation({
    mutationFn: () => orgSubscriptionService.checkout(confirmPlan!.uuid),
    onSuccess: (data) => {
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast.error(t("payments.checkoutFailed"));
        setConfirmPlan(null);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("common.failed")),
  });

  const submit = () => {
    if (!confirmPlan) return;
    checkout.mutate();
  };

  return (
    <div>
      <PageHeader title={t("payments.title")} description={t("payments.description")} />

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t(status === "expired" ? "payments.subscribeExpiredTitle" : "payments.subscribeTitle")}
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(status === "expired" ? "payments.subscribeExpiredDesc" : "payments.subscribeDesc")}
          </p>

          {plans.isLoading ? (
            <div className="mt-6"><DvarifLoader size="sm" /></div>
          ) : (plans.data ?? []).length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={CreditCard} title={t("payments.noAvailablePlans")} description={t("payments.noAvailablePlansDesc")} />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(plans.data ?? []).map((p: SubscriptionPlan) => (
                <div key={p.uuid} className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                      {p.billing_period && (
                        <Badge variant="outline" className="rounded-full text-xs uppercase">
                          {p.billing_period}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 text-lg font-semibold text-foreground">
                      Rs. {p.monthly_price?.toLocaleString("en-PK")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">/ {t("payments.perMonth")}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {p.daily_request_quota?.toLocaleString()} {t("payments.requestsPerDay")}
                    </div>
                    {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                  <Button className="mt-4 w-full" size="sm" onClick={() => setConfirmPlan(p)}>
                    <CreditCard className="mr-1.5 h-4 w-4" /> {t("payments.subscribe")}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-md border border-warning/30 bg-warning/5 p-4 text-xs text-muted-foreground">
            {t("payments.subscribeNote")}
          </div>

          {payments.length > 0 && (
            <div className="mt-6">
              <BillingHistory payments={payments} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm self-subscribe dialog */}
      <Dialog open={!!confirmPlan} onOpenChange={(o) => !o && setConfirmPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.confirmSubscribe")}</DialogTitle>
            <DialogDescription>{t("payments.confirmSubscribeDesc")}</DialogDescription>
          </DialogHeader>
          {confirmPlan && (
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
              <div className="font-semibold text-foreground">{confirmPlan.name}</div>
              <div className="mt-1 text-muted-foreground">
                Rs. {confirmPlan.monthly_price?.toLocaleString("en-PK")} / {t("payments.perMonth")} ·{" "}
                {confirmPlan.daily_request_quota?.toLocaleString()} {t("payments.requestsPerDay")}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("payments.confirmCheckoutNote")}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmPlan(null)} disabled={checkout.isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={!confirmPlan || checkout.isPending} loading={checkout.isPending}>
              {t("payments.confirmSubscribeAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── Pending payment (awaiting System Admin confirmation) ─────────── */
function PendingSection({
  planData,
  orgSub,
  payments,
}: {
  planData: PlanSummary | undefined;
  orgSub: OrgSubscription | undefined;
  payments: Payment[];
}) {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t("payments.title")} description={t("payments.description")} />
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("payments.pendingTitle")}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("payments.pendingDesc")}</p>
          {orgSub?.plan_name && (
            <Badge variant="outline" className="mt-4 rounded-full capitalize">
              {orgSub.plan_name}
            </Badge>
          )}
        </CardContent>
      </Card>
      {payments.length > 0 && (
        <div className="mt-6"><BillingHistory payments={payments} /></div>
      )}
    </div>
  );
}

function BillingHistory({ payments }: { payments: Payment[] }) {
  const { t } = useTranslation();
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border p-6">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("payments.billingHistory")}</h3>
        </div>
        {payments.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Wallet} title={t("payments.noBillingHistory")} description={t("payments.noBillingDesc")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">S.No</TableHead>
                  <TableHead>{t("payments.reference")}</TableHead>
                  <TableHead>{t("payments.method")}</TableHead>
                  <TableHead>{t("payments.purpose")}</TableHead>
                  <TableHead>{t("payments.date")}</TableHead>
                  <TableHead className="text-right">{t("payments.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p, i) => (
                  <TableRow key={p.uuid}>
                    <TableCell className="w-10 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell data-label={t("payments.reference")} className="font-mono text-xs">{p.transaction_reference}</TableCell>
                    <TableCell data-label={t("payments.method")}>
                      <Badge variant="outline" className="rounded-full capitalize">{p.payment_method}</Badge>
                    </TableCell>
                    <TableCell data-label={t("payments.purpose")} className="text-muted-foreground">{p.purpose}</TableCell>
                    <TableCell data-label={t("payments.date")} className="text-xs text-muted-foreground">{formatDate(p.paid_at ?? p.created_at)}</TableCell>
                    <TableCell data-label={t("payments.amount")} className="text-right font-medium">Rs. {p.amount?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanPage({
  planData,
  orgSub,
  quotaStatus,
  payments,
}: {
  planData: PlanSummary | undefined;
  orgSub: OrgSubscription | undefined;
  quotaStatus: QuotaStatus | undefined;
  payments: Payment[];
}) {
  const { t } = useTranslation();
  const isOrgActive = orgSub?.status === "active";

  const quota = useQuery({
    queryKey: ["org-subscription-quota"],
    queryFn: () => orgSubscriptionService.quota(),
    enabled: !!orgSub && orgSub.status !== "none",
  });
  const liveQuota = (quota.data ?? quotaStatus) as QuotaStatus | undefined;

  const customRequests = useQuery({
    queryKey: ["org-custom-plan-requests"],
    queryFn: () => orgSubscriptionService.customPlanRequests(),
    enabled: !!orgSub && orgSub.status !== "none",
  });
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const requestCustom = useMutation({
    mutationFn: () => orgSubscriptionService.requestCustomPlan(message),
    onSuccess: () => {
      toast.success(t("payments.customPlanSubmitted"));
      setMessage("");
      qc.invalidateQueries({ queryKey: ["org-custom-plan-requests"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("common.failed")),
  });
  const submitCustom = () => {
    if (!message.trim()) return toast.error(t("payments.requestRequired"));
    requestCustom.mutate();
  };

  const { user } = useAuth();
  const isOrgAdmin = user?.org_role === "org_admin";
  const [viewOpen, setViewOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<UUID | undefined>(undefined);

  const availablePlans = useQuery({
    queryKey: ["org-available-plans"],
    queryFn: () => marketingService.listPlans(),
    enabled: changeOpen,
  });

  // Changing plans ALWAYS goes through Safepay checkout. The plan only changes
  // after payment is confirmed via webhook — there is no immediate switch path.
  const changePlanCheckout = useMutation({
    mutationFn: (planUuid: UUID) => orgSubscriptionService.checkout(planUuid, "change_plan"),
    onSuccess: (data) => {
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast.error(t("payments.checkoutFailed"));
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("common.failed")),
  });

  return (
    <div>
      <PageHeader
        title={t("payments.title")}
        description={t("payments.description")}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        {/* Subscription details */}
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{t("payments.subscriptionDetails")}</h3>
              </div>
              {isOrgAdmin && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewOpen(true)}>
                    {t("payments.viewPlans")}
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => setChangeOpen(true)}>
                    <RefreshCw className="mr-1 h-3 w-3" /> {t("payments.changePlan")}
                  </Button>
                </div>
              )}
            </div>

            {isOrgActive && orgSub ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-success/30 bg-success/5 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold text-success">{t("payments.activeSubscription")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("payments.activeSubscriptionDesc")}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                    <div className="text-muted-foreground">{t("payments.plan")}</div>
                    <div className="mt-0.5 text-sm font-medium text-foreground capitalize">
                      {orgSub.plan_name ?? orgSub.plan ?? "—"}
                    </div>
                  </div>
                  {orgSub.monthly_price != null && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <div className="text-muted-foreground">{t("payments.price")}</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        Rs. {orgSub.monthly_price.toLocaleString("en-PK")} / {t("payments.perMonth")}
                      </div>
                    </div>
                  )}
                  {orgSub.daily_request_quota != null && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <div className="text-muted-foreground">{t("payments.requestLimit")}</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        {orgSub.daily_request_quota} {t("payments.requestsPerDay")}
                      </div>
                    </div>
                  )}
                  {orgSub.start && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <div className="text-muted-foreground">{t("payments.started")}</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        {formatDate(orgSub.start)}
                      </div>
                    </div>
                  )}
                  {orgSub.expiry && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <div className="text-muted-foreground">{t("payments.expires")}</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        {formatDate(orgSub.expiry)}
                      </div>
                    </div>
                  )}
                </div>

                {orgSub.description && (
                  <p className="text-xs text-muted-foreground">{orgSub.description}</p>
                )}
                {orgSub.features && orgSub.features.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">
                      {t("payments.includedWithPlan")}
                    </div>
                    <ul className="space-y-1.5">
                      {orgSub.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <div className="rounded-md border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("payments.noActiveSubContact")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily request quota */}
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t("payments.requestQuota")}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("payments.requestQuotaDesc")}</p>

            <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <QuotaRing
                used={Number(liveQuota?.total_requests ?? 0)}
                total={Math.max(1, Number(liveQuota?.total_allowance ?? 1))}
                label={t("payments.usedToday")}
                sublabel={`${t("payments.remainingToday")}: ${Math.max(0, Number(liveQuota?.total_allowance ?? 1) - Number(liveQuota?.total_requests ?? 0))}`}
                tone="accent"
              />
              <div className="grid w-full flex-1 gap-3">
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-semibold text-primary">{t("payments.freeRequest")}</div>
                      <div className="text-muted-foreground">{t("payments.freeIncluded")}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full">1</Badge>
                </div>

                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">{t("payments.planQuota")}</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">
                    {(liveQuota?.plan_quota ?? 0)} {t("payments.requests")}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">{t("payments.usedToday")}</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">
                    {(liveQuota?.total_requests ?? 0)} / {(liveQuota?.total_allowance ?? 1)}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">{t("payments.remainingToday")}</div>
                  <div className="mt-0.5 text-sm font-medium text-success">
                    {Math.max(0, Number(liveQuota?.total_allowance ?? 1) - Number(liveQuota?.total_requests ?? 0))} {t("payments.requests")}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Custom Plan */}
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t("payments.customPlan")}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("payments.customPlanDesc")}</p>

            <div className="mt-4 space-y-2">
              <Label htmlFor="cp-message">{t("payments.customPlanMessage")}</Label>
              <Textarea
                id="cp-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("payments.customPlanMessagePlaceholder")}
                rows={3}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={submitCustom} disabled={requestCustom.isPending}>
                  <Send className="mr-1.5 h-4 w-4" />
                  {t("payments.customPlanSubmit")}
                </Button>
              </div>
            </div>

            {customRequests.data && customRequests.data.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                  {t("payments.yourCustomPlanRequests")}
                </h4>
                <div className="space-y-2">
                  {customRequests.data.map((r: CustomPlanRequest) => (
                    <div
                      key={r.uuid}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-3 text-xs"
                    >
                      <p className="min-w-0 flex-1 truncate text-muted-foreground">{r.message}</p>
                      <Badge
                        variant="outline"
                        className={`rounded-full capitalize ${
                          r.status === "approved"
                            ? "border-success/30 bg-success/10 text-success"
                            : r.status === "denied"
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : "border-warning/30 bg-warning/10 text-warning-foreground"
                        }`}
                      >
                        {t(`payments.${r.status === "pending" ? "customPlanPending" : r.status === "approved" ? "customPlanApproved" : "customPlanDenied"}`)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing history */}
      <div className="mt-6">
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border p-6">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t("payments.billingHistory")}</h3>
            </div>
            {payments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Wallet}
                  title={t("payments.noBillingHistory")}
                  description={t("payments.noBillingDesc")}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">S.No</TableHead>
                      <TableHead>{t("payments.reference")}</TableHead>
                      <TableHead>{t("payments.method")}</TableHead>
                      <TableHead>{t("payments.purpose")}</TableHead>
                      <TableHead>{t("payments.date")}</TableHead>
                      <TableHead className="text-right">{t("payments.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={p.uuid}>
                        <TableCell className="w-10 text-muted-foreground">{i + 1}</TableCell>
                        <TableCell data-label={t("payments.reference")} className="font-mono text-xs">{p.transaction_reference}</TableCell>
                        <TableCell data-label={t("payments.method")}>
                          <Badge variant="outline" className="rounded-full capitalize">
                            {p.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell data-label={t("payments.purpose")} className="text-muted-foreground">{p.purpose}</TableCell>
                        <TableCell data-label={t("payments.date")} className="text-xs text-muted-foreground">
                          {formatDate(p.paid_at ?? p.created_at)}
                        </TableCell>
                        <TableCell data-label={t("payments.amount")} className="text-right font-medium">Rs. {p.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Plan (view-only — no actions) */}
      <Dialog open={viewOpen} onOpenChange={(o) => !o && setViewOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.viewPlans")}</DialogTitle>
            <DialogDescription>{t("payments.viewPlanDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="text-muted-foreground">{t("payments.plan")}</div>
              <div className="mt-0.5 text-sm font-medium text-foreground capitalize">
                {orgSub?.plan_name ?? orgSub?.plan ?? "—"}
              </div>
            </div>
            {orgSub?.monthly_price != null && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <div className="text-muted-foreground">{t("payments.price")}</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">
                  Rs. {orgSub.monthly_price?.toLocaleString("en-PK")} / {t("payments.perMonth")}
                </div>
              </div>
            )}
            {orgSub?.daily_request_quota != null && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <div className="text-muted-foreground">{t("payments.requestLimit")}</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">
                  {orgSub.daily_request_quota} {t("payments.requestsPerDay")}
                </div>
              </div>
            )}
            {orgSub?.expiry && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <div className="text-muted-foreground">{t("payments.expires")}</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">
                  {formatDate(orgSub.expiry)}
                </div>
              </div>
            )}
            {orgSub?.features && orgSub.features.length > 0 && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">{t("payments.includedWithPlan")}</div>
                <ul className="mt-1 space-y-1">
                  {orgSub.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setViewOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan — always via Safepay checkout */}
      <Dialog open={changeOpen} onOpenChange={(o) => !o && setChangeOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.changePlan")}</DialogTitle>
            <DialogDescription>{t("payments.changePlanCheckoutDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("payments.selectPlan")}</Label>
              <Select
                value={selectedPlan}
                onValueChange={(v) => setSelectedPlan(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("payments.selectPlanPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(availablePlans.data ?? []).map((p: SubscriptionPlan) => (
                    <SelectItem key={p.uuid} value={p.uuid}>
                      {p.name} — Rs. {p.monthly_price?.toLocaleString()} · {p.daily_request_quota}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(availablePlans.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">{t("payments.noAvailablePlans")}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("payments.changePlanRestart")}</p>
            <p className="text-xs text-muted-foreground">{t("payments.changePlanCheckoutNote")}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangeOpen(false)} disabled={changePlanCheckout.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => selectedPlan && changePlanCheckout.mutate(selectedPlan)}
              disabled={!selectedPlan || changePlanCheckout.isPending}
              loading={changePlanCheckout.isPending}
            >
              {t("payments.confirmChange")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
