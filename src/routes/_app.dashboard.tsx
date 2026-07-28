import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Building2,
  FileCheck2,
  Inbox,
  Send,
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldX,
  Eye,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardService } from "@/services";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import { Lock } from "lucide-react";

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

function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { isLocked } = useOrgSubscription();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const q = useQuery({
    queryKey: ["dashboard", user?.role],
    queryFn: () => dashboardService.auto(),
    enabled: mounted,
    retry: false,
  });

  const data = q.data;
  const adminStats: Stat[] = [
    { label: "Total Users", value: data?.total_users ?? 0, icon: Users, href: "/admin/users", progress: data?.users_progress ?? 0 },
    { label: "Organizations", value: data?.total_organizations ?? 0, icon: Building2, href: "/admin/organizations", progress: data?.organizations_progress ?? 0 },
    { label: "Verified Requests", value: data?.verified_requests ?? 0, icon: ShieldCheck, href: "/admin/requests", progress: data?.requests_progress ?? 0 },
    { label: "Unverified Requests", value: data?.unverified_requests ?? 0, icon: ShieldX, href: "/admin/requests" },
    { label: "Under Review", value: data?.under_review_requests ?? 0, icon: Eye, href: "/admin/requests" },
    { label: "Unmatched Orgs", value: data?.total_admin_requests ?? 0, icon: AlertTriangle, href: "/admin/null-requests", progress: data?.unmatched_progress ?? 100, hint: "Pending admin review" },
  ];
  const userStats: Stat[] = [
    { label: "My Requests Sent", value: data?.total_verification_requests ?? 0, icon: Send, href: "/requests", progress: data?.requests_progress ?? 0 },
    { label: "Verified", value: data?.verified_requests ?? 0, icon: ShieldCheck, href: "/requests" },
    { label: "Unverified", value: data?.unverified_requests ?? 0, icon: ShieldX, href: "/requests" },
    { label: "Under Review", value: data?.under_review_requests ?? 0, icon: Eye, href: "/requests" },
  ];
  const stats = isAdmin ? adminStats : userStats;

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Admin overview" : `Welcome back${user ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description={
          isAdmin
            ? "Platform-wide activity across every organization in the network."
            : isLocked
              ? "Your organization subscription is not active. Some features are restricted."
              : "Track requests you've submitted and view unmatched requests."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(q.isLoading ? Array.from({ length: stats.length }) : stats).map((raw, i) => {
          const s = raw as Stat | undefined;
          const cardLocked = !isAdmin && isLocked;
          return (
            <Card key={i} className={`border-border/70 shadow-none ${cardLocked ? "opacity-60" : ""}`}>
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
                          <Lock className="h-3 w-3" /> Locked
                        </Link>
                      ) : (
                        <Link
                          to={s.href}
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          View all <ArrowUpRight className="h-3 w-3" />
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
                  <>
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="mt-5 h-7 w-16" />
                    <Skeleton className="mt-2 h-3 w-24" />
                    <Skeleton className="mt-4 h-1.5 w-full" />
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isAdmin && data?.upcoming_expirations && data.upcoming_expirations.length > 0 && (
        <Card className="mt-6 border-border/70 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Upcoming Expirations</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Organizations with subscriptions expiring within 7 days.
            </p>
            <div className="mt-4 space-y-2">
              {data.upcoming_expirations.map((exp) => {
                const expiryDate = new Date(String(exp.subscription_expiry).replace(" ", "T"));
                const now = new Date();
                const hoursLeft = Math.max(0, Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
                const isUrgent = hoursLeft <= 2;
                return (
                  <div key={exp.uuid} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isUrgent ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{exp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Expires: {formatDate(exp.subscription_expiry)}
                          {exp.subscription_plan ? ` (${exp.subscription_plan})` : ""}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={isUrgent ? "border-red-500/30 bg-red-500/10 text-red-500" : "border-amber-500/30 bg-amber-500/10 text-amber-500"}
                    >
                      {isUrgent ? `${hoursLeft}h left` : `${Math.ceil(hoursLeft / 24)}d left`}
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
