import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Lock,
  Check,
  RefreshCw,
  Sparkles,
  Send,
  Layers,
  MessageSquareText,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DverifLoader } from "@/components/common/DvarifLoader";
import { useRoles } from "@/lib/permissions";
import {
  marketingService,
  orgSubscriptionService,
  MODULE_FEATURES,
  type SubscriptionPlan,
  type CustomPlanRequest,
  type ModuleFlags,
  type UUID,
} from "@/services";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";

export function SubscriptionBanner() {
  const { t } = useTranslation();
  const { isOrgAdmin, isStaff } = useRoles();
  const { orgSub, isActive } = useOrgSubscription();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UUID | undefined>(undefined);

  const [quota, setQuota] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  const plans = useQuery({
    queryKey: ["plans-banner"],
    queryFn: () => marketingService.listPlans(),
    enabled: open,
  });

  const customRequests = useQuery({
    queryKey: ["org-custom-plan-requests"],
    queryFn: () => orgSubscriptionService.customPlanRequests(),
    enabled: open,
  });

  const requestCustom = useMutation({
    mutationFn: () =>
      orgSubscriptionService.requestCustomPlan({
        message: note.trim(),
        requested_quota: Number(quota),
        requested_price: price.trim() ? Number(price) : null,
      }),
    onSuccess: () => {
      toast.success(t("payments.customPlanSubmitted"));
      setQuota("");
      setPrice("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["org-custom-plan-requests"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("common.failed")),
  });

  const submitCustom = () => {
    const quotaNum = Number(quota);
    if (!quota.trim() || !Number.isInteger(quotaNum) || quotaNum <= 0) {
      toast.error(t("payments.customPlanQuotaRequired"));
      return;
    }
    if (price.trim()) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        toast.error(t("payments.customPlanPriceInvalid"));
        return;
      }
    }
    requestCustom.mutate();
  };

  const checkoutMut = useMutation({
    mutationFn: (planUuid: UUID) => orgSubscriptionService.checkout(planUuid),
    onSuccess: (data) => {
      if (data?.redirect_url) {
        setOpen(false);
        window.location.href = data.redirect_url;
      } else {
        toast.error(t("payments.checkoutFailed"));
        setSelected(undefined);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("common.failed")),
  });

  const isBusy = checkoutMut.isPending || requestCustom.isPending;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <Lock className="h-4 w-4 text-destructive" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {t("subscriptionLocked.notActive")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("subscriptionLocked.contactAdmin")}
        </p>
      </div>
      {isStaff && (
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
          {t("subscriptionLocked.viewPlans")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("subscriptionLocked.viewPlans")}</DialogTitle>
            <DialogDescription>
              {t("subscriptionLocked.selectPlanHint")}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="plans">
                <Layers className="mr-1.5 h-4 w-4" /> {t("subscriptionLocked.plansTab")}
              </TabsTrigger>
              <TabsTrigger value="custom">
                <Sparkles className="mr-1.5 h-4 w-4" /> {t("subscriptionLocked.customPlanTab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.isLoading && (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <DverifLoader />
                  </div>
                )}
                {plans.isError && (
                  <p className="col-span-full text-sm text-destructive">{t("subscriptionLocked.loadError")}</p>
                )}
                {plans.data && plans.data.length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">{t("subscriptionLocked.empty")}</p>
                )}
                {(plans.data ?? [])
                  .filter((p) => p.is_free !== 1)
                  .map((plan: SubscriptionPlan) => {
                    const active = plan.uuid === selected;
                    const isCurrent =
                      isActive &&
                      orgSub?.plan_name != null &&
                      orgSub.plan_name.toLowerCase() === plan.name.toLowerCase();
                    return (
                      <Card
                        key={plan.uuid}
                        role="button"
                        tabIndex={isOrgAdmin && !isCurrent ? 0 : -1}
                        onClick={() => {
                          if (!isOrgAdmin || isCurrent || isBusy) return;
                          setSelected(plan.uuid);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          if (!isOrgAdmin || isCurrent || isBusy) return;
                          setSelected(plan.uuid);
                        }}
                        className={`flex flex-col rounded-xl bg-card text-left shadow-none transition hover:shadow-md ${
                          isCurrent
                            ? "border-primary/60 ring-1 ring-primary/40"
                            : active
                              ? "border-primary bg-primary/5"
                              : "border-border/70 hover:border-primary/40"
                        } ${isOrgAdmin && !isCurrent ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <CardContent className="flex flex-1 flex-col gap-4 p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Layers className="h-5 w-5 text-primary" />
                            </div>
                            {isCurrent && (
                              <Badge variant="secondary" className="rounded-full text-[11px]">
                                {t("subscriptionLocked.activePlan")}
                              </Badge>
                            )}
                            {active && !isCurrent && (
                              <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>

                          <div>
                            <div className="text-base font-semibold capitalize text-foreground">
                              {plan.name}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {plan.description ||
                                `${plan.daily_request_quota} ${t("payments.requestsPerDay")}`}
                            </p>
                          </div>

                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">
                              Rs. {plan.monthly_price?.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / {t("payments.perMonth")}
                            </span>
                          </div>

                          {isCurrent ? (
                            <Button variant="outline" className="w-full" disabled>
                              <Check className="mr-1.5 h-4 w-4" /> {t("subscriptionLocked.currentPlan")}
                            </Button>
                          ) : (
                            <Button
                              className="w-full"
                              onClick={() => {
                                if (!isOrgAdmin || isBusy) return;
                                setSelected(plan.uuid);
                              }}
                              disabled={!isOrgAdmin || isBusy}
                            >
                              {t("subscriptionLocked.selectPlan")}
                            </Button>
                          )}

                          <div className="border-t border-border pt-3">
                            {plan.features && plan.features.length > 0 ? (
                              <ul className="space-y-1.5">
                                {plan.features.slice(0, 4).map((f, i) => (
                                  <li
                                    key={i}
                                    className={`flex items-start gap-2 text-xs ${
                                      f.highlight
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <Check
                                      className={`mt-0.5 h-3 w-3 shrink-0 ${f.highlight ? "text-primary" : "text-success"}`}
                                    />
                                    <span>{f.text}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">{t("payments.noFeaturesDesc")}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={isBusy}>
                  {t("common.cancel")}
                </Button>
                {isOrgAdmin && (
                  <Button
                    onClick={() => selected && checkoutMut.mutate(selected)}
                    disabled={!selected || checkoutMut.isPending}
                    loading={checkoutMut.isPending}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" /> {t("subscriptionLocked.renewNow")}
                  </Button>
                )}
                {!isOrgAdmin && (
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    {t("common.close")}
                  </Button>
                )}
              </DialogFooter>
            </TabsContent>

            <TabsContent value="custom" className="space-y-3">
              {isStaff ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {t("subscriptionLocked.customPlanHint")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("subscriptionLocked.dailyQuota")}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={quota}
                        onChange={(e) => setQuota(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("subscriptionLocked.pricePerMonth")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("subscriptionLocked.optionalNote")}</Label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("payments.customPlanMessagePlaceholder")}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={submitCustom} disabled={requestCustom.isPending}>
                      <Send className="mr-1.5 h-4 w-4" />
                      {t("payments.customPlanSubmit")}
                    </Button>
                  </div>

                  {customRequests.data && customRequests.data.length > 0 && (
                    <div className="pt-2">
                      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                        {t("payments.yourCustomPlanRequests")}
                      </h4>
                      <div className="space-y-2">
                        {customRequests.data.map((r: CustomPlanRequest) => (
                          <div
                            key={r.uuid}
                            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-3 text-xs"
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
                              </div>
                              {r.message && (
                                <p className="mt-1 truncate text-muted-foreground">{r.message}</p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 rounded-full capitalize ${
                                r.status === "approved"
                                  ? "border-success/30 bg-success/10 text-success"
                                  : r.status === "denied"
                                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                                    : "border-warning/30 bg-warning/10 text-warning-foreground"
                              }`}
                            >
                              {t(
                                `payments.${
                                  r.status === "pending"
                                    ? "customPlanPending"
                                    : r.status === "approved"
                                      ? "customPlanApproved"
                                      : "customPlanDenied"
                                }`
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/40 p-6 text-center">
                  <MessageSquareText className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {t("subscriptionLocked.contactAdminHint")}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                    {t("common.close")}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FeatureLockedCard({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="relative overflow-hidden border-dashed border-destructive/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Lock className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/payments">Renew Subscription</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ModuleFeatureLockedCard({ feature }: { feature: keyof ModuleFlags }) {
  const { isModuleFlagOff } = useOrgSubscription();
  const label = MODULE_FEATURES.find((m) => m.key === feature)?.label ?? feature;
  if (!isModuleFlagOff(feature)) return null;
  return (
    <FeatureLockedCard
      title={`${label} unavailable`}
      description={`${label} is not included in your organization's current plan. Contact your admin to upgrade.`}
    />
  );
}
