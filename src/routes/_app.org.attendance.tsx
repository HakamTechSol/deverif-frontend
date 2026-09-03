import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Info, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "./_app.requests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orgAttendanceService } from "@/services";
import { formatDate, formatDateTime, parseFeatureAccess } from "@/lib/utils";

export const Route = createFileRoute("/_app/org/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Dvarif" }] }),
  component: OrgAttendancePage,
});

const PAGE_SIZE = 10;

function OrgAttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff =
    user?.role === "user" &&
    (user?.org_role === "org_admin" ||
      (user?.org_role === "sub_admin" && parseFeatureAccess(user.feature_access).attendance));

  useEffect(() => {
    if (user && !isStaff) navigate({ to: "/dashboard" });
  }, [user, isStaff, navigate]);

  if (user && !isStaff) return null;

  return <OrgAttendanceContent />;
}

function OrgAttendanceContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canDelete = user?.org_role === "org_admin";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ipInput, setIpInput] = useState("");

  const ips = useQuery({
    queryKey: ["orgAllowedIps"],
    queryFn: () => orgAttendanceService.ips(),
  });

  const records = useQuery({
    queryKey: ["orgAttendance", page, search, status, dateFrom, dateTo],
    queryFn: () =>
      orgAttendanceService.list({
        page,
        limit: PAGE_SIZE,
        search,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const addIp = useMutation({
    mutationFn: (ip: string) => orgAttendanceService.addIp(ip),
    onSuccess: () => {
      toast.success(t("attendance.ipAdded"));
      qc.invalidateQueries({ queryKey: ["orgAllowedIps"] });
      setIpInput("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("attendance.addIpFailed")),
  });

  const removeIp = useMutation({
    mutationFn: (ip: string) => orgAttendanceService.removeIp(ip),
    onSuccess: () => {
      toast.success(t("attendance.ipRemoved"));
      qc.invalidateQueries({ queryKey: ["orgAllowedIps"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? t("attendance.removeIpFailed")),
  });

  const items = records.data?.items ?? [];
  const allowedIps = ips.data ?? [];

  return (
    <div>
      <PageHeader title={t("nav.attendance")} description={t("attendance.description")} />

      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {t("attendance.allowedIpsTitle")}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("attendance.aboutIpRestriction")}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{t("attendance.ipTooltip")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.0/24 or 203.0.113.5"
              className="sm:max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && ipInput.trim()) addIp.mutate(ipInput.trim());
              }}
            />
            <Button
              size="sm"
              onClick={() => addIp.mutate(ipInput.trim())}
              disabled={!ipInput.trim() || addIp.isPending}
            >
              <Plus className="mr-1 h-3 w-3" /> {t("attendance.addIp")}
            </Button>
          </div>
          {allowedIps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("attendance.noIpsMessage")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allowedIps.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  {ip}
                  {canDelete ? (
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      onClick={() => removeIp.mutate(ip)}
                      disabled={removeIp.isPending}
                      aria-label={t("attendance.removeIpLabel", { ip })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={t("attendance.searchEmployee")}
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder={t("attendance.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("attendance.allStatuses")}</SelectItem>
                <SelectItem value="checked_in">{t("status.checked_in")}</SelectItem>
                <SelectItem value="checked_out">{t("status.checked_out")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="lg:w-40"
              />
              <span className="text-xs text-muted-foreground">{t("common.to")}</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="lg:w-40"
              />
            </div>
          </div>

          {records.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ShieldCheck}
                title={t("attendance.emptyTitle")}
                description={t("attendance.emptyDesc")}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">S.No</TableHead>
                      <TableHead className="whitespace-nowrap">
                        {t("attendance.employee")}
                      </TableHead>
                      <TableHead className="whitespace-nowrap">{t("attendance.date")}</TableHead>
                      <TableHead className="whitespace-nowrap">{t("attendance.checkIn")}</TableHead>
                      <TableHead className="whitespace-nowrap">
                        {t("attendance.checkOut")}
                      </TableHead>
                      <TableHead className="whitespace-nowrap">{t("attendance.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r, i) => (
                      <TableRow key={r.uuid}>
                        <TableCell className="w-10 text-muted-foreground">
                          {(page - 1) * 10 + i + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {r.employee_name ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.employee_email ?? ""}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(r.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {r.check_in_at ? formatDateTime(r.check_in_at) : "—"}
                          {r.check_in_ip && (
                            <div className="text-xs text-muted-foreground/70">{r.check_in_ip}</div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {r.check_out_at ? formatDateTime(r.check_out_at) : "—"}
                          {r.check_out_ip && (
                            <div className="text-xs text-muted-foreground/70">{r.check_out_ip}</div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={page}
                total={records.data?.total ?? 0}
                totalPages={records.data?.totalPages ?? 1}
                onChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
