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
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardService } from "@/services";
import { useAuth } from "@/lib/auth";

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
    { label: "Verification Requests", value: data?.total_verification_requests ?? 0, icon: FileCheck2, href: "/admin/requests", progress: data?.requests_progress ?? 0 },
    { label: "Unmatched Orgs", value: data?.total_admin_requests ?? 0, icon: AlertTriangle, href: "/admin/null-requests", progress: data?.unmatched_progress ?? 100, hint: "Pending admin review" },
  ];
  const userStats: Stat[] = [
    { label: "Organizations", value: data?.total_organizations ?? 0, icon: Building2, href: "/settings", progress: data?.organizations_progress ?? 0 },
    { label: "My Requests Sent", value: data?.total_verification_requests ?? 0, icon: Send, href: "/requests", progress: data?.requests_progress ?? 0 },
    { label: "Unmatched Requests", value: data?.total_admin_requests ?? 0, icon: Inbox, href: "/inbox", progress: data?.unmatched_progress ?? 100 },
  ];
  const stats = isAdmin ? adminStats : userStats;

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Admin overview" : `Welcome back${user ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description={
          isAdmin
            ? "Platform-wide activity across every organization in the network."
            : "Track requests you've submitted and view unmatched requests."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(q.isLoading ? Array.from({ length: stats.length }) : stats).map((raw, i) => {
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
                        View all <ArrowUpRight className="h-3 w-3" />
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

      <Card className="mt-8 border-border/70 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Jump to key areas of the platform.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {isAdmin ? (
              <>
                <QuickLink to="/admin/users" label="Manage users" icon={Users} />
                <QuickLink to="/admin/organizations" label="Organizations" icon={Building2} />
                <QuickLink to="/admin/requests" label="All requests" icon={FileCheck2} />
                <QuickLink to="/admin/null-requests" label="Unmatched orgs" icon={AlertTriangle} />
              </>
            ) : (
              <>
                <QuickLink to="/requests" label="New request" icon={Send} />
                <QuickLink to="/inbox" label="Check inbox" icon={Inbox} />
                <QuickLink to="/payments" label="View plan" icon={ArrowUpRight} />
                <QuickLink to="/settings" label="Settings" icon={ArrowUpRight} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      <ArrowUpRight className="ml-auto h-3 w-3 text-muted-foreground" />
    </Link>
  );
}
