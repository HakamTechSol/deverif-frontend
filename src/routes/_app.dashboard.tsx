import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Building2,
  FileCheck2,
  Inbox,
  Send,
  Users,
  AlertTriangle,
  Clock3,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const q = useQuery({
    queryKey: ["dashboard", user?.role],
    queryFn: () => dashboardService.auto(),
  });

  const totals = q.data?.totals ?? {};
  const adminStats: Stat[] = [
    { label: "Total Users", value: totals.users ?? 0, icon: Users, href: "/admin/users", progress: 72 },
    { label: "Organizations", value: totals.organizations ?? 0, icon: Building2, href: "/admin/organizations", progress: 54 },
    { label: "Verification Requests", value: totals.requests ?? 0, icon: FileCheck2, href: "/admin/requests", progress: 88 },
    { label: "Unmatched Orgs", value: totals.null_org_pending ?? 0, icon: AlertTriangle, href: "/admin/null-requests", progress: 40, hint: "Pending admin review" },
  ];
  const userStats: Stat[] = [
    { label: "My Organizations", value: totals.my_organizations ?? 0, icon: Building2, href: "/settings", progress: 60 },
    { label: "My Requests Sent", value: totals.my_requests ?? 0, icon: Send, href: "/requests", progress: 74 },
    { label: "Inbox Requests", value: totals.inbox_requests ?? 0, icon: Inbox, href: "/inbox", progress: 45 },
  ];
  const stats = isAdmin ? adminStats : userStats;
  const recent = q.data?.recent ?? [];

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Admin overview" : `Welcome back${user ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description={
          isAdmin
            ? "Platform-wide activity across every organization in the network."
            : "Track requests you've submitted and act on ones assigned to your team."
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
                    <Progress value={s.progress ?? 60} className="mt-4 h-1.5" />
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

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
                <p className="text-xs text-muted-foreground">
                  Latest verification requests across the workspace.
                </p>
              </div>
              <Link
                to={isAdmin ? "/admin/requests" : "/requests"}
                className="text-xs font-medium text-primary hover:underline"
              >
                See all
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      No recent activity yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((r) => (
                    <TableRow key={r.uuid}>
                      <TableCell className="font-medium text-foreground">
                        {r.document_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.issuing_organization?.name ?? r.other_organization_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={r.priority} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">SLA & throughput</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Median time-to-verify across the last 30 days.
            </p>
            <div className="mt-6 space-y-4">
              <MiniMetric label="Median response" value="4h 12m" progress={68} />
              <MiniMetric label="Verified rate" value="94%" progress={94} />
              <MiniMetric label="Escalations" value="6" progress={22} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <Progress value={progress} className="mt-2 h-1.5" />
    </div>
  );
}
