import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Lock, Plus, Trash2, Wallet, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { authStore, useAuth } from "@/lib/auth";
import { parseFeatureAccess } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import { AccessDenied } from "@/components/common/RequireOrgFeature";
import { ModuleFeatureLockedCard } from "@/components/common/SubscriptionLocked";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TableSkeleton } from "./_app.requests";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orgSalaryService, orgService, type SalaryRecord, type EmployeeRecord } from "@/services";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_app/org/payroll")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user") throw redirect({ to: "/dashboard" });
    if (user.org_role === "org_admin") return;
    if (user.org_role === "sub_admin" && parseFeatureAccess(user.feature_access).payroll) return;
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Payroll — Dverif" }] }),
  component: OrgPayrollPage,
});

const PAGE_SIZE = 10;

function money(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
}

function OrgPayrollPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isLocked, isModuleFlagOff } = useOrgSubscription();

  const [tab, setTab] = useState<"employees" | "records">("employees");

  // Records (history) filters
  const [page, setPage] = useState(1);
  const [recSearch, setRecSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Employee selection
  const [empSearch, setEmpSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Period modal
  const [periodOpen, setPeriodOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());

  const [downloading, setDownloading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryRecord | null>(null);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const canDelete = user?.org_role === "org_admin";

  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    new Date(2026, i, 1).toLocaleDateString(undefined, { month: "long" }),
  );

  const records = useQuery({
    queryKey: ["orgSalaryRecords", page, recSearch, month, year],
    queryFn: () =>
      orgSalaryService.list({
        page,
        limit: PAGE_SIZE,
        search: recSearch || undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      }),
  });

  // All org employees for the selection table.
  const employeesQ = useQuery({
    queryKey: ["orgEmployeesForPayroll"],
    queryFn: () => orgService.employees({ page: 1, limit: 1000 }),
  });

  const allEmployees = employeesQ.data?.items ?? [];
  const filteredEmployees = empSearch.trim()
    ? allEmployees.filter((e) => {
        const q = empSearch.trim().toLowerCase();
        return (
          e.full_name.toLowerCase().includes(q) ||
          (e.designation && e.designation.toLowerCase().includes(q)) ||
          (e.email && e.email.toLowerCase().includes(q)) ||
          (e.department && e.department.toLowerCase().includes(q))
        );
      })
    : allEmployees;

  // Prune selections that no longer exist (e.g. employee deleted).
  const validSelected = new Set(
    [...selected].filter((id) => allEmployees.some((e) => e.uuid === id)),
  );
  const allVisibleSelected =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => validSelected.has(e.uuid));

  // ---- Upfront existence check for the chosen period ----
  const periodExistingQ = useQuery({
    queryKey: ["orgSalaryExisting", genMonth, genYear],
    queryFn: () => orgSalaryService.list({ page: 1, limit: 1000, month: genMonth, year: genYear }),
    enabled: periodOpen,
    retry: false,
  });
  const existingPeriodUuids = new Set(
    (periodExistingQ.data?.items ?? []).map((r) => r.employee_uuid),
  );
  const alreadyGeneratedSelected = [...validSelected].filter((id) => existingPeriodUuids.has(id));
  const selectedHasExisting = alreadyGeneratedSelected.length > 0;

  const toggleEmployee = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredEmployees.forEach((e) => next.delete(e.uuid));
      } else {
        filteredEmployees.forEach((e) => next.add(e.uuid));
      }
      return next;
    });
  };

  const generate = useMutation<
    {
      items: SalaryRecord[];
      month: number;
      year: number;
      count: number;
      skipped?: number;
      message?: string;
    },
    Error,
    { uuids: string[]; month: number; year: number }
  >({
    mutationFn: ({ uuids, month, year }) =>
      orgSalaryService.generate({
        month,
        year,
        employee_uuids: uuids.length ? uuids : undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        res.skipped && res.skipped > 0
          ? t("payroll.generatedSkipped", { count: res.count, skipped: res.skipped })
          : t("payroll.generated", { count: res.count }),
      );
      qc.invalidateQueries({ queryKey: ["orgSalaryRecords"] });
      setPeriodOpen(false);
      setSelected(new Set());
      setTab("records");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 409) {
        toast.error(
          t("payroll.alreadyGenerated", {
            period: `${MONTHS[genMonth - 1]} ${genYear}`,
          }),
        );
      } else {
        toast.error(apiErrorMessage(e, t("payroll.generationFailed")));
      }
    },
  });

  const regenerate = useMutation<
    {
      items: SalaryRecord[];
      month: number;
      year: number;
      count: number;
    },
    Error,
    { uuids: string[]; month: number; year: number }
  >({
    mutationFn: ({ uuids, month, year }) =>
      orgSalaryService.generate({
        month,
        year,
        employee_uuids: uuids,
        regenerate: true,
      }),
    onSuccess: (res) => {
      toast.success(t("payroll.regenerated", { count: res.count }));
      qc.invalidateQueries({ queryKey: ["orgSalaryRecords"] });
      setRegenerateOpen(false);
      setPeriodOpen(false);
      setSelected(new Set());
      setTab("records");
    },
    onError: (e) => toast.error(apiErrorMessage(e, t("payroll.regenerateFailed"))),
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await orgSalaryService.exportCsv({
        search: recSearch || undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dverif-payroll.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, t("payroll.exportFailed")));
    } finally {
      setExporting(false);
    }
  };

  const downloadPayslip = async (record: SalaryRecord) => {
    setDownloading(record.uuid);
    try {
      const blob = await orgSalaryService.payslip(record.uuid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dverif-payslip-${record.uuid.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Payslip download failed"));
    } finally {
      setDownloading(null);
    }
  };

  const deleteRecord = useMutation({
    mutationFn: (uuid: string) => orgSalaryService.deleteRecord(uuid),
    onSuccess: () => {
      toast.success(t("payroll.periodDeleted"));
      qc.invalidateQueries({ queryKey: ["orgSalaryRecords"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t("payroll.deleteFailed"))),
  });

  const items = records.data?.items ?? [];
  const years: number[] = [];
  const nowYear = new Date().getFullYear();
  for (let y = nowYear - 1; y <= nowYear + 1; y++) years.push(y);

  const perms = usePermissions();
  if (!perms.isOrgAdmin && !perms.payroll) return <AccessDenied feature="payroll" />;

  const moduleLocked = isModuleFlagOff("payroll_management");
  if (moduleLocked) return <ModuleFeatureLockedCard feature="payroll_management" />;

  return (
    <div>
      <PageHeader
        title={t("nav.payroll")}
        description={t("payroll.description")}
        actions={
          tab === "records" ? (
            <div className="flex shrink-0 flex-nowrap gap-2 whitespace-nowrap">
              <Button
                className="w-40 shrink-0 justify-center"
                variant="outline"
                onClick={exportCsv}
                disabled={isLocked || exporting || items.length === 0}
              >
                {isLocked ? <Lock className="mr-1.5 h-3.5 w-3.5" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                {isLocked ? "Subscription Required" : exporting ? t("payroll.exporting") : t("payroll.exportCsv")}
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
              <span className="text-sm text-muted-foreground">
                {t("payroll.selectedCount", { count: validSelected.size })}
              </span>
              <Button
                className="shrink-0 justify-center"
                disabled={isLocked || validSelected.size === 0}
                onClick={() => setPeriodOpen(true)}
              >
                {isLocked ? <Lock className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
                {isLocked ? "Subscription Required" : t("payroll.generatePayroll")}
              </Button>
            </div>
          )
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "employees" | "records")}
        className="mt-2"
      >
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="mr-1.5 h-4 w-4" />
            {t("payroll.employeesTab", "Employees")}
          </TabsTrigger>
          <TabsTrigger value="records">
            <FileText className="mr-1.5 h-4 w-4" />
            {t("payroll.recordsTab", "Payroll Records")}
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Employee selection table ---------------- */}
        <TabsContent value="employees">
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
                <SearchInput
                  value={empSearch}
                  onChange={setEmpSearch}
                  placeholder={t("payroll.searchEmployee")}
                />
                <span className="text-xs text-muted-foreground">
                  {filteredEmployees.length} / {allEmployees.length}{" "}
                  {t("payroll.employeeCountSuffix", "employees")}
                </span>
              </div>

              {employeesQ.isLoading ? (
                <TableSkeleton />
              ) : filteredEmployees.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Users}
                    title={t("payroll.noEmployeesFound")}
                    description={t("payroll.noEmployeeDesc", "No employees have been added yet.")}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleAllVisible}
                            aria-label={t("payroll.selectAll")}
                          />
                        </TableHead>
                        <TableHead className="whitespace-nowrap">{t("payroll.employee")}</TableHead>
                        <TableHead className="whitespace-nowrap hidden sm:table-cell">
                          {t("payroll.designationCol", "Designation")}
                        </TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">
                          {t("payroll.departmentCol", "Department")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp: EmployeeRecord) => (
                        <TableRow key={emp.uuid}>
                          <TableCell className="w-10">
                            <Checkbox
                              checked={validSelected.has(emp.uuid)}
                              onCheckedChange={() => toggleEmployee(emp.uuid)}
                              aria-label={emp.full_name}
                            />
                          </TableCell>
                          <TableCell data-label="Employee" className="whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">
                              {emp.full_name}
                            </div>
                            {emp.email ? (
                              <div className="text-xs text-muted-foreground">{emp.email}</div>
                            ) : null}
                          </TableCell>
                          <TableCell data-label="Designation" className="whitespace-nowrap text-sm text-muted-foreground hidden sm:table-cell">
                            {emp.designation ?? "—"}
                          </TableCell>
                          <TableCell data-label="Department" className="whitespace-nowrap text-sm text-muted-foreground hidden md:table-cell">
                            {emp.department ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Payroll records (history) table ---------------- */}
        <TabsContent value="records">
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
                <SearchInput
                  value={recSearch}
                  onChange={(v) => {
                    setRecSearch(v);
                    setPage(1);
                  }}
                  placeholder={t("payroll.searchEmployee")}
                />
                <Select
                  value={month}
                  onValueChange={(v) => {
                    setMonth(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder={t("payroll.allMonths")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("payroll.allMonths")}</SelectItem>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={String(i + 1)} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={year}
                  onValueChange={(v) => {
                    setYear(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full lg:w-32">
                    <SelectValue placeholder={t("payroll.allYears")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("payroll.allYears")}</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {records.isLoading ? (
                <TableSkeleton />
              ) : items.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Wallet}
                    title={t("payroll.noPayrollYet")}
                    description={t("payroll.noPayrollDesc")}
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
                            {t("payroll.employee")}
                          </TableHead>
                          <TableHead className="whitespace-nowrap">{t("payroll.period")}</TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            {t("payroll.basic")}
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            {t("payroll.allowances")}
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            {t("payroll.deductions")}
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            {t("payroll.net")}
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            {t("payroll.payslip")}
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-right">—</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((r, i) => (
                          <TableRow key={r.uuid}>
                            <TableCell data-label="S.No" className="w-10 text-muted-foreground">
                              {(page - 1) * 10 + i + 1}
                            </TableCell>
                            <TableCell data-label="Employee" className="whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {r.employee_name ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.employee_email ?? ""}
                              </div>
                            </TableCell>
                            <TableCell data-label="Period" className="whitespace-nowrap text-sm text-muted-foreground">
                              {MONTHS[Number(r.month) - 1]} {r.year}
                            </TableCell>
                            <TableCell data-label="Basic" className="whitespace-nowrap text-right text-sm text-muted-foreground">
                              {money(r.basic_salary)}
                            </TableCell>
                            <TableCell data-label="Allowances" className="whitespace-nowrap text-right text-sm text-muted-foreground">
                              {money(r.allowances)}
                            </TableCell>
                            <TableCell data-label="Deductions" className="whitespace-nowrap text-right text-sm text-muted-foreground">
                              {money(r.deductions)}
                            </TableCell>
                            <TableCell data-label="Net" className="whitespace-nowrap text-right text-sm font-semibold text-foreground">
                              {money(r.net_salary)}
                            </TableCell>
                            <TableCell data-label="Payslip" className="whitespace-nowrap text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadPayslip(r)}
                                disabled={downloading === r.uuid}
                              >
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                {downloading === r.uuid ? "…" : t("payroll.payslip")}
                              </Button>
                            </TableCell>
                            <TableCell data-label="—" className="whitespace-nowrap text-right">
                              {canDelete ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive"
                                  disabled={isLocked}
                                  onClick={() => setDeleteTarget(r)}
                                >
                                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              ) : null}
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
        </TabsContent>
      </Tabs>

      {/* ---------- Period-only modal (Year + Month) ---------- */}
      <Dialog
        open={periodOpen}
        onOpenChange={(o) => {
          if (!o) setPeriodOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("payroll.generateTitle")}</DialogTitle>
            <DialogDescription>
              {t("payroll.generateSelectionDesc", {
                count: validSelected.size,
                defaultValue:
                  "Choose the month and year. Payroll will be generated for {{count}} selected employee(s).",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("payroll.payrollMonth", "Month")}</label>
              <Select value={String(genMonth)} onValueChange={(v) => setGenMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("payroll.payrollYear", "Year")}</label>
              <Select value={String(genYear)} onValueChange={(v) => setGenYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedHasExisting ? (
            <div className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span className="font-medium">
                {t("payroll.alreadyGeneratedNote", {
                  count: alreadyGeneratedSelected.length,
                  period: `${MONTHS[genMonth - 1]} ${genYear}`,
                })}
              </span>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPeriodOpen(false)}
              disabled={generate.isPending || regenerate.isPending}
            >
              {t("actions.cancel", "Cancel")}
            </Button>
            {selectedHasExisting ? (
              <Button
                variant="destructive"
                onClick={() => setRegenerateOpen(true)}
                disabled={generate.isPending || regenerate.isPending}
                loading={regenerate.isPending}
              >
                {t("payroll.regenerateSelected", { count: alreadyGeneratedSelected.length })}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  generate.mutate({ uuids: [...validSelected], month: genMonth, year: genYear })
                }
                disabled={generate.isPending || regenerate.isPending}
                loading={generate.isPending}
              >
                {t("payroll.generatePayroll")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={(o) => !o && setRegenerateOpen(false)}
        title={t("payroll.regenerateTitle", {
          defaultValue: "Regenerate payroll for this period?",
        })}
        description={t("payroll.regenerateConfirm", {
          count: alreadyGeneratedSelected.length,
          period: `${MONTHS[genMonth - 1]} ${genYear}`,
          defaultValue:
            "This will overwrite the existing payroll for {{count}} selected employee(s) for {{period}}. Existing records will be deleted and recomputed. This cannot be undone.",
        })}
        confirmLabel={t("payroll.regenerate", { defaultValue: "Regenerate" })}
        onConfirm={() =>
          regenerate.mutate({ uuids: alreadyGeneratedSelected, month: genMonth, year: genYear })
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("payroll.deleteRecordTitle", { defaultValue: "Delete this payroll record?" })}
        description={t("payroll.deleteRecordConfirm", {
          defaultValue: "Only this employee payroll record will be deleted.",
        })}
        onConfirm={() => deleteTarget && deleteRecord.mutate(deleteTarget.uuid)}
      />
    </div>
  );
}
