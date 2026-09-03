import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Building2,
  Send,
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldX,
  Eye,
  Wallet,
  CalendarDays,
  ClipboardCheck,
  CalendarClock,
  CalendarCheck,
  Lock,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DvarifLoader } from "@/components/common/DvarifLoader";
import { dashboardService } from "@/services";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import {
  leavesService,
  salaryService,
  attendanceService,
  orgLeavesService,
  orgAttendanceService,
  type LeaveBalance,
  type SalaryRecord,
} from "@/services";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Dvarif" }] }),
  component: DashboardPage,
});

type Stat = {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  hint?: string;
  progress?: number;
};

function money(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const orgRole = user?.org_role;
  const firstName = user ? `, ${user.full_name.split(" ")[0]}` : "";

  if (isAdmin) return <SystemAdminDashboard />;
  if (orgRole === "employee") return <EmployeeDashboard firstName={firstName} />;
  if (orgRole === "sub_admin") return <SubAdminDashboard />;
  return <OrgAdminDashboard firstName={firstName} />;
}

/* ------------------------------------------------------------------ */
/* System admin — global verification/system overview                  */
/* ------------------------------------------------------------------ */
function SystemAdminDashboard() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const q = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: () => dashboardService.auto(),
    enabled: mounted,
    retry: false,
  });

  const data = q.data;
  const adminStats: Stat[] = [
    {
      label: t("dashboard.totalUsers"),
      value: data?.total_users ?? 0,
      icon: Users,
      href: "/admin/users",
      progress: data?.users_progress ?? 0,
    },
    {
      label: t("dashboard.organizations"),
      value: data?.total_organizations ?? 0,
      icon: Building2,
      href: "/admin/organizations",
      progress: data?.organizations_progress ?? 0,
    },
    {
      label: t("dashboard.verifiedRequests"),
      value: data?.verified_requests ?? 0,
      icon: ShieldCheck,
      href: "/admin/requests",
      progress: data?.requests_progress ?? 0,
    },
    {
      label: t("dashboard.unverifiedRequests"),
      value: data?.unverified_requests ?? 0,
      icon: ShieldX,
      href: "/admin/requests",
    },
    {
      label: t("dashboard.underReview"),
      value: data?.under_review_requests ?? 0,
      icon: Eye,
      href: "/admin/requests",
    },
    {
      label: t("dashboard.unmatchedOrgs"),
      value: data?.total_admin_requests ?? 0,
      icon: AlertTriangle,
      href: "/admin/null-requests",
      progress: data?.unmatched_progress ?? 100,
      hint: t("dashboard.pendingAdminReview"),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("dashboard.adminOverview")}
        description={t("dashboard.adminOverviewSub")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(q.isLoading ? Array.from({ length: adminStats.length }) : adminStats).map((raw, i) => {
          const s = raw as Stat | undefined;
          return (
            <Card key={i} className="border-border/70 shadow-none">
              <CardContent className="p-5">
                {s ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <s.icon className="h-4 w-4" />
                      </div>
                      <Link
                        to={s.href}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {t("dashboard.viewAll")} <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="mt-5">
                      <div className="text-2xl font-semibold tracking-tight text-foreground">
                        {s.value.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{s.label}</div>
                    </div>
                    <Progress value={s.progress ?? 0} className="mt-4 h-1.5" />
                    {s.hint ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">{s.hint}</p>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-[104px] items-center justify-center">
                    <DvarifLoader size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data?.upcoming_expirations && data.upcoming_expirations.length > 0 && (
        <Card className="mt-6 border-border/70 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">
                {t("dashboard.upcomingExpirations")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.expiringSubtitle")}</p>
            <div className="mt-4 space-y-2">
              {data.upcoming_expirations.map((exp) => {
                const expiryDate = new Date(String(exp.subscription_expiry).replace(" ", "T"));
                const now = new Date();
                const hoursLeft = Math.max(
                  0,
                  Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)),
                );
                const isUrgent = hoursLeft <= 2;
                return (
                  <div
                    key={exp.uuid}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-md ${isUrgent ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}
                      >
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{exp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("dashboard.expires")}: {formatDate(exp.subscription_expiry)}
                          {exp.subscription_plan ? ` (${exp.subscription_plan})` : ""}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        isUrgent
                          ? "border-red-500/30 bg-red-500/10 text-red-500"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                      }
                    >
                      {isUrgent
                        ? `${hoursLeft}${t("dashboard.hLeft")}`
                        : `${Math.ceil(hoursLeft / 24)}${t("dashboard.dLeft")}`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Org admin — verification-request widgets (kept as before)           */
/* ------------------------------------------------------------------ */
function OrgAdminDashboard({ firstName }: { firstName: string }) {
  const { t } = useTranslation();
  const { isLocked } = useOrgSubscription();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const q = useQuery({
    queryKey: ["dashboard", "org_admin"],
    queryFn: () => dashboardService.auto(),
    enabled: mounted,
    retry: false,
  });

  const data = q.data;
  const userStats: Stat[] = [
    {
      label: t("dashboard.myRequestsSent"),
      value: data?.total_verification_requests ?? 0,
      icon: Send,
      href: "/requests",
      progress: data?.requests_progress ?? 0,
    },
    {
      label: t("dashboard.verified"),
      value: data?.verified_requests ?? 0,
      icon: ShieldCheck,
      href: "/requests",
    },
    {
      label: t("dashboard.unverified"),
      value: data?.unverified_requests ?? 0,
      icon: ShieldX,
      href: "/requests",
    },
    {
      label: t("dashboard.underReview"),
      value: data?.under_review_requests ?? 0,
      icon: Eye,
      href: "/requests",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`${t("dashboard.welcomeBack")}${firstName}`}
        description={isLocked ? t("dashboard.lockedSub") : t("dashboard.trackSub")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(q.isLoading ? Array.from({ length: userStats.length }) : userStats).map((raw, i) => {
          const s = raw as Stat | undefined;
          const cardLocked = isLocked;
          return (
            <Card
              key={i}
              className={`border-border/70 shadow-none ${cardLocked ? "opacity-60" : ""}`}
            >
              <CardContent className="p-5">
                {s ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <s.icon className="h-4 w-4" />
                      </div>
                      {cardLocked ? (
                        <Link
                          to="/payments"
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive hover:text-destructive"
                        >
                          <Lock className="h-3 w-3" /> {t("dashboard.locked")}
                        </Link>
                      ) : (
                        <Link
                          to={s.href}
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          {t("dashboard.viewAll")} <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <div className="mt-5">
                      <div className="text-2xl font-semibold tracking-tight text-foreground">
                        {s.value.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{s.label}</div>
                    </div>
                    <Progress value={s.progress ?? 0} className="mt-4 h-1.5" />
                    {s.hint ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">{s.hint}</p>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-[104px] items-center justify-center">
                    <DvarifLoader size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-admin — operational widgets (leave pending, today attendance)   */
/* ------------------------------------------------------------------ */
function SubAdminDashboard() {
  const { t } = useTranslation();
  const { isLocked } = useOrgSubscription();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pendingLeaves = useQuery({
    queryKey: ["subadmin-dash-pending-leaves"],
    queryFn: () => orgLeavesService.list({ page: 1, limit: 1, status: "pending" }),
    enabled: mounted,
    retry: false,
  });

  const todayAttendance = useQuery({
    queryKey: ["subadmin-dash-today-attendance"],
    queryFn: () => orgAttendanceService.list({ page: 1, limit: 100 }),
    enabled: mounted,
    retry: false,
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysRecords = (todayAttendance.data?.items ?? []).filter(
    (r) => String(r.date).slice(0, 10) === todayStr,
  );
  const presentCount = todaysRecords.filter(
    (r) => r.status === "checked_in" || r.status === "checked_out",
  ).length;

  const cards: Stat[] = [
    {
      label: t("dashboardSubAdmin.pendingLeaveRequests"),
      value: pendingLeaves.data?.total ?? 0,
      icon: CalendarClock,
      href: "/org/leaves",
    },
    {
      label: t("dashboardSubAdmin.todayAttendance"),
      value: presentCount,
      icon: ClipboardCheck,
      href: "/org/attendance",
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("dashboardSubAdmin.title")}
        description={isLocked ? t("dashboard.lockedSub") : t("dashboardSubAdmin.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(pendingLeaves.isLoading || todayAttendance.isLoading
          ? Array.from({ length: 2 })
          : cards
        ).map((raw, i) => {
          const s = raw as Stat | undefined;
          return (
            <Card
              key={i}
              className={`border-border/70 shadow-none ${isLocked ? "opacity-60" : ""}`}
            >
              <CardContent className="p-5">
                {s ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <s.icon className="h-4 w-4" />
                      </div>
                      <Link
                        to={s.href}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {t("dashboard.viewAll")} <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="mt-5">
                      <div className="text-2xl font-semibold tracking-tight text-foreground">
                        {s.value.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-[104px] items-center justify-center">
                    <DvarifLoader size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Employee — leave balance, this month's payslip, attendance summary  */
/* ------------------------------------------------------------------ */
function EmployeeDashboard({ firstName }: { firstName: string }) {
  const { t } = useTranslation();
  const { isLocked } = useOrgSubscription();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const now = new Date();
  const curMonth = String(now.getMonth() + 1);
  const curYear = String(now.getFullYear());

  const balancesQ = useQuery({
    queryKey: ["employee-dash-balances"],
    queryFn: () => leavesService.balance(),
    enabled: mounted,
    retry: false,
  });

  const payslipQ = useQuery({
    queryKey: ["employee-dash-payslip", curMonth, curYear],
    queryFn: () => salaryService.mine({ page: 1, limit: 20, month: curMonth, year: curYear }),
    enabled: mounted,
    retry: false,
  });

  const attendanceQ = useQuery({
    queryKey: ["employee-dash-attendance", curMonth, curYear],
    queryFn: () => attendanceService.history({ page: 1, limit: 100 }),
    enabled: mounted,
    retry: false,
  });

  const balances: LeaveBalance[] = balancesQ.data ?? [];
  const payslips: SalaryRecord[] = payslipQ.data?.items ?? [];
  const payslip =
    payslips.find((r) => String(r.month) === curMonth && String(r.year) === curYear) ?? payslips[0];

  const monthPrefix = `${curYear}-${curMonth.padStart(2, "0")}`;
  const presentDays = (attendanceQ.data?.items ?? []).filter((r) => {
    const d = String(r.date).slice(0, 7);
    return d === monthPrefix && (r.status === "checked_in" || r.status === "checked_out");
  }).length;

  return (
    <div>
      <PageHeader
        title={t("dashboard.welcomeBack") + firstName}
        description={isLocked ? t("dashboard.lockedSub") : t("dashboard.employeeSub")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* This month's payslip */}
        <Card className={`border-border/70 shadow-none ${isLocked ? "opacity-60" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8">
                <Link to="/payroll">
                  {t("dashboard.viewPayslip")} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {payslipQ.isLoading ? (
              <div className="flex h-[104px] items-center justify-center">
                <DvarifLoader size="sm" />
              </div>
            ) : payslip ? (
              <>
                <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  {money(payslip.net_salary)}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {t("dashboard.netSalary")}
                </div>
              </>
            ) : payslipQ.isError ? (
              <div className="mt-5 text-xl font-medium text-destructive">—</div>
            ) : (
              <div className="mt-5 text-sm text-muted-foreground">
                {t("dashboard.noPayslipYet")}
              </div>
            )}
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {t("dashboard.payslipPeriod", { period: `${curMonth}/${curYear}` })}
            </p>
          </CardContent>
        </Card>

        {/* My attendance this month */}
        <Card className={`border-border/70 shadow-none ${isLocked ? "opacity-60" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8">
                <Link to="/attendance">
                  {t("dashboard.viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {attendanceQ.isLoading ? (
              <div className="flex h-[104px] items-center justify-center">
                <DvarifLoader size="sm" />
              </div>
            ) : (
              <>
                <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  {presentDays}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {t("dashboard.daysPresent")}
                </div>
              </>
            )}
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {t("dashboard.attendancePeriod", { period: `${curMonth}/${curYear}` })}
            </p>
          </CardContent>
        </Card>

        {/* My leave balance */}
        <Card className={`border-border/70 shadow-none ${isLocked ? "opacity-60" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarDays className="h-4 w-4" />
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8">
                <Link to="/leaves">
                  {t("dashboard.viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {balancesQ.isLoading ? (
              <div className="flex h-[104px] items-center justify-center">
                <DvarifLoader size="sm" />
              </div>
            ) : balances.length === 0 ? (
              <div className="mt-5 text-sm text-muted-foreground">
                {t("dashboard.noLeaveBalance")}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {balances.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{b.leave_type_name}</span>
                    <Badge variant="outline" className="shrink-0">
                      {b.remaining} {t("dashboard.days")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
