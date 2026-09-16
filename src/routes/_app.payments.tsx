import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Calendar,
  Building2,
  Wallet,
  Gauge,
  Sparkles,
  Send,
  Check,
  RefreshCw,
  Clock,
  CalendarDays,
  CalendarClock,
  Layers,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { DverifLoader } from "@/components/common/DvarifLoader";
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
  type OrgSubscription,
  type Payment,
  type QuotaStatus,
  type CustomPlanRequest,
  type SubscriptionPlan,
  type UUID,
} from "@/services";
import { formatDate } from "@/lib/utils";
import { authStore } from "@/lib/auth";

export const Route = createFileRoute("/_app/payments")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user" || user.org_role !== "org_admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Payments — Dverif" }] }),
  component: PaymentsPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold capitalize text-foreground">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "denied" }) {
  const { t } = useTranslation();
  const key = status === "pending" ? "customPlanPending" : status === "approved" ? "customPlanApproved" : "customPlanDenied";
  const tone =
    status === "approved"
      ? "border-success/30 bg-success/10 text-success"
      : status === "denied"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-warning/30 bg-warning/10 text-warning-foreground";
  return (
    <Badge variant="outline" className={`shrink-0 rounded-full capitalize ${tone}`}>
      {t(`payments.${key}`)}
    </Badge>
  );
}

function PaymentsPage() {
  const { t } = useTranslation();
  const plan = useQuery({ queryKey: ["plan"], queryFn: () => paymentService.plan() });

  const orgSub = plan.data?.org_subscription as OrgSubscription | undefined;
  const quotaStatus = plan.data?.quota_status as QuotaStatus | undefined;
  const payments = plan.data?.payments as Payment[] | undefined;

  if (plan.isLoading) {
    return (
      <div>
        <PageHeader title={t("payments.title")} description={t("payments.description")} />
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 py-16"
        >
          <DverifLoader size="md" />
          <p className="text-sm text-muted-foreground">{t("payments.loading")}</p>
        </div>
      </div>
    );
  }

  if (orgSub && (orgSub.status === "none" || orgSub.status === "expired")) {
    return <SubscribeSection status={orgSub.status} orgSub={orgSub} payments={payments ?? []} />;
  }

  if (orgSub && orgSub.status === "pending_payment") {
    return <PendingSection orgSub={orgSub} payments={payments ?? []} />;
  }

  return <PlanPage orgSub={orgSub} quotaStatus={quotaStatus} payments={payments ?? []} />;
}

/* ─────────── Subscribe (no active subscription: none/expired) ─────────── */
function SubscribeSection({
  status,
  orgSub,
  payments,
}: {
  status: "none" | "expired";
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
    <div className="space-y-6">
      <PageHeader title={t("payments.title")} description={t("payments.description")} />

      <Card className="relative overflow-hidden border-border/70 shadow-none">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t(status === "expired" ? "payments.subscribeExpiredTitle" : "payments.subscribeTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t(status === "expired" ? "payments.subscribeExpiredDesc" : "payments.subscribeDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {plans.isLoading ? (
        <div className="py-10">
          <DverifLoader size="sm" />
        </div>
      ) : (plans.data ?? []).length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t("payments.noAvailablePlans")}
          description={t("payments.noAvailablePlansDesc")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plans.data ?? []).map((p: SubscriptionPlan) => (
            <Card
              key={p.uuid}
              className="flex flex-col border-border/70 shadow-none transition hover:border-primary/40 hover:shadow-sm"
            >
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                  {p.billing_period && (
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                      {p.billing_period}
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-semibold text-foreground">
                    Rs. {p.monthly_price?.toLocaleString("en-PK")}
                  </span>
                  <span className="text-xs text-muted-foreground"> / {t("payments.perMonth")}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  {p.daily_request_quota?.toLocaleString()} {t("payments.requestsPerDay")}
                </div>
                {p.description && (
                  <p className="mt-3 text-xs text-muted-foreground">{p.description}</p>
                )}
                {p.features && p.features.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {p.features.slice(0, 4).map((f, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-xs ${
                          f.highlight ? "font-semibold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <Check
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${f.highlight ? "text-primary" : "text-success"}`}
                        />
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="mt-4 w-full" size="sm" onClick={() => setConfirmPlan(p)}>
                  <CreditCard className="mr-1.5 h-4 w-4" /> {t("payments.subscribe")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-muted-foreground">
        {t("payments.subscribeNote")}
      </div>

      {payments.length > 0 && <BillingHistory payments={payments} />}

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
          <p className="text-xs text-muted-foreground">{t("payments.confirmCheckoutNote")}</p>
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
  orgSub,
  payments,
}: {
  orgSub: OrgSubscription | undefined;
  payments: Payment[];
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
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
      {payments.length > 0 && <BillingHistory payments={payments} />}
    </div>
  );
}

function BillingHistory({ payments }: { payments: Payment[] }) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden border-border/70 shadow-none">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
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
                <TableHead className="w-12">S.No</TableHead>
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
                  <TableCell className="w-12 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{p.transaction_reference}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full capitalize">{p.payment_method}</Badge>
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
    </Card>
  );
}

/* ─────────── Active subscription ─────────── */
function PlanPage({
  orgSub,
  quotaStatus,
  payments,
}: {
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
  const freeDaily = Number(liveQuota?.free_daily_requests ?? 0);
  const usedToday = Number(liveQuota?.total_requests ?? 0);
  const allowance = Math.max(1, Number(liveQuota?.total_allowance ?? 1));
  const remaining = Math.max(0, allowance - usedToday);
  const usedPct = Math.min(100, Math.round((usedToday / allowance) * 100));

  const customRequests = useQuery({
    queryKey: ["org-custom-plan-requests"],
    queryFn: () => orgSubscriptionService.customPlanRequests(),
    enabled: !!orgSub && orgSub.status !== "none",
  });
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [reqQuota, setReqQuota] = useState("");
  const [reqPrice, setReqPrice] = useState("");
  const requestCustom = useMutation({
    mutationFn: () =>
      orgSubscriptionService.requestCustomPlan({
        message: message.trim(),
        requested_quota: Number(reqQuota),
        requested_price: reqPrice.trim() ? Number(reqPrice) : null,
      }),
    onSuccess: () => {
      toast.success(t("payments.customPlanSubmitted"));
      setMessage("");
      setReqQuota("");
      setReqPrice("");
      qc.invalidateQueries({ queryKey: ["org-custom-plan-requests"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("common.failed")),
  });
  const submitCustom = () => {
    const quotaNum = Number(reqQuota);
    if (!reqQuota.trim() || !Number.isInteger(quotaNum) || quotaNum <= 0) {
      return toast.error(t("payments.customPlanQuotaRequired"));
    }
    if (reqPrice.trim()) {
      const priceNum = Number(reqPrice);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return toast.error(t("payments.customPlanPriceInvalid"));
      }
    }
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

  const planName = orgSub?.plan_name ?? orgSub?.plan ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("payments.title")}
        description={t("payments.description")}
        actions={
          isOrgAdmin ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setViewOpen(true)}>
                <Eye className="mr-1.5 h-4 w-4" /> {t("payments.viewPlans")}
              </Button>
              <Button size="sm" onClick={() => setChangeOpen(true)}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> {t("payments.changePlan")}
              </Button>
            </>
          ) : undefined
        }
      />

      {isOrgActive && orgSub ? (
        <>
          {/* Hero */}
          <Card className="relative overflow-hidden border-border/70 shadow-none">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold capitalize text-foreground">{planName}</h2>
                    <Badge className="rounded-full border-success/30 bg-success/10 text-success hover:bg-success/10">
                      {t("payments.active")}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {orgSub.description || t("payments.activeSubscriptionDesc")}
                  </p>
                </div>
              </div>
              {orgSub.monthly_price != null && (
                <div className="shrink-0 sm:text-right">
                  <p className="text-2xl font-semibold text-foreground">
                    Rs. {orgSub.monthly_price.toLocaleString("en-PK")}
                  </p>
                  <p className="text-xs text-muted-foreground">/ {t("payments.perMonth")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CreditCard} label={t("payments.plan")} value={planName} />
            <StatCard
              icon={Gauge}
              label={t("payments.requestLimit")}
              value={
                orgSub.daily_request_quota != null
                  ? `${orgSub.daily_request_quota} ${t("payments.requestsPerDay")}`
                  : "—"
              }
            />
            <StatCard icon={CalendarDays} label={t("payments.started")} value={formatDate(orgSub.start)} />
            <StatCard icon={CalendarClock} label={t("payments.expires")} value={formatDate(orgSub.expiry)} />
          </div>

          {/* Quota + included features */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="border-border/70 shadow-none lg:col-span-3">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">{t("payments.requestQuota")}</CardTitle>
                </div>
                <CardDescription className="text-xs">{t("payments.requestQuotaDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <QuotaRing
                    used={usedToday}
                    total={allowance}
                    label={t("payments.usedToday")}
                    sublabel={`${t("payments.remainingToday")}: ${remaining}`}
                    tone="accent"
                  />
                  <div className="w-full flex-1 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("payments.todayUsage")}</span>
                        <span className="font-medium text-foreground">
                          {usedToday} / {allowance}
                        </span>
                      </div>
                      <Progress value={usedPct} className="mt-1.5 h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{t("payments.planQuota")}</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {liveQuota?.plan_quota ?? 0} {t("payments.requests")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{t("payments.remainingToday")}</p>
                        <p className="mt-0.5 text-sm font-semibold text-success">
                          {remaining} {t("payments.requests")}
                        </p>
                      </div>
                    </div>

                    {freeDaily > 0 && (
                      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-semibold text-primary">{t("payments.freeRequest")}</div>
                            <div className="text-muted-foreground">{t("payments.freeIncluded")}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full">{freeDaily}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-none lg:col-span-2">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">{t("payments.includedWithPlan")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {orgSub.features && orgSub.features.length > 0 ? (
                  <ul className="space-y-2.5">
                    {orgSub.features.map((f, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-sm ${
                          f.highlight ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                          <Check className="h-3 w-3 text-success" />
                        </span>
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("payments.noFeaturesDesc")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Request custom plan */}
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">{t("payments.customPlan")}</CardTitle>
              </div>
              <CardDescription className="text-xs">{t("payments.customPlanDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cp-quota">{t("payments.customPlanQuotaLabel")}</Label>
                  <Input
                    id="cp-quota"
                    type="number"
                    min="1"
                    step="1"
                    value={reqQuota}
                    onChange={(e) => setReqQuota(e.target.value)}
                    placeholder={t("payments.customPlanQuotaPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-price">{t("payments.customPlanPriceLabel")}</Label>
                  <Input
                    id="cp-price"
                    type="number"
                    min="1"
                    step="any"
                    value={reqPrice}
                    onChange={(e) => setReqPrice(e.target.value)}
                    placeholder={t("payments.customPlanPricePlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-message">{t("payments.customPlanMessage")}</Label>
                <Textarea
                  id="cp-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("payments.customPlanMessagePlaceholder")}
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={submitCustom} disabled={requestCustom.isPending}>
                  <Send className="mr-1.5 h-4 w-4" />
                  {t("payments.customPlanSubmit")}
                </Button>
              </div>

              {customRequests.data && customRequests.data.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                    {t("payments.yourCustomPlanRequests")}
                  </h4>
                  <div className="space-y-2">
                    {customRequests.data.map((r: CustomPlanRequest) => (
                      <div
                        key={r.uuid}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {r.requested_quota != null && (
                              <span className="font-medium text-foreground">
                                {r.requested_quota} {t("payments.requestsPerDay")}
                              </span>
                            )}
                            {(r.requested_price ?? r.approved_price) != null && (
                              <span className="text-muted-foreground">
                                Rs. {Number(r.requested_price ?? r.approved_price).toLocaleString("en-PK")}
                              </span>
                            )}
                            {r.status === "approved" && r.approved_daily_quota != null && (
                              <span className="text-success">
                                {t("payments.customPlanApprovedQuota", { quota: r.approved_daily_quota })}
                              </span>
                            )}
                          </div>
                          {r.message && (
                            <p className="mt-1 truncate text-muted-foreground">{r.message}</p>
                          )}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t("payments.noActiveSubContact")}</p>
          </CardContent>
        </Card>
      )}

      <BillingHistory payments={payments} />

      {/* View plan (view-only — no actions) */}
      <Dialog open={viewOpen} onOpenChange={(o) => !o && setViewOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.viewPlans")}</DialogTitle>
            <DialogDescription>{t("payments.viewPlanDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="text-muted-foreground">{t("payments.plan")}</div>
              <div className="mt-0.5 text-sm font-medium capitalize text-foreground">{planName}</div>
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
                <div className="mt-0.5 text-sm font-medium text-foreground">{formatDate(orgSub.expiry)}</div>
              </div>
            )}
            {orgSub?.features && orgSub.features.length > 0 && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">{t("payments.includedWithPlan")}</div>
                <ul className="mt-1 space-y-1">
                  {orgSub.features.map((f, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-xs ${
                        f.highlight ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${f.highlight ? "text-primary" : "text-success"}`}
                      />
                      <span>{f.text}</span>
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

      {/* Change plan — always via Safepay checkout */}
      <Dialog open={changeOpen} onOpenChange={(o) => !o && setChangeOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.changePlan")}</DialogTitle>
            <DialogDescription>{t("payments.changePlanCheckoutDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("payments.selectPlan")}</Label>
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v)}>
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
