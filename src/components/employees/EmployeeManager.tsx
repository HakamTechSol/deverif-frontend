import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Archive, Contact, Eye, FileUp, Lock, Mail, Plus, RefreshCw, Send, Trash2, Users } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ProtectedDocumentLink } from "@/components/common/ProtectedDocumentLink";
import { EmployeeDocPicker, type StagedDoc } from "@/components/employees/EmployeeDocPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TableSkeleton } from "@/routes/_app.requests";
import { adminService, orgService, type EmployeeDocument, type EmployeeRecord, type ManagedOption, type Organization, type UUID } from "@/services";
import { digitsOnly, formatCNIC, formatDate, formatFileSize } from "@/lib/utils";

type EmployeeApi = {
  list: (params: { page?: number; limit?: number; search?: string; reference?: boolean }) => Promise<{
    items: EmployeeRecord[];
    total: number;
    totalPages: number;
  }>;
  create: (data: Record<string, unknown>) => Promise<{ employee: EmployeeRecord }>;
  update: (uuid: UUID, data: Record<string, unknown>) => Promise<EmployeeRecord>;
  remove: (uuid: UUID) => Promise<unknown>;
  archiveReference?: (uuid: UUID) => Promise<EmployeeRecord>;
};

function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
}

const STATUS_OPTIONS: { value: EmployeeRecord["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive (invite pending)" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
];

function statusBadgeClass(status: EmployeeRecord["status"]) {
  switch (status) {
    case "active":
      return "rounded-full border-success/30 bg-success/10 text-success";
    case "inactive":
      return "rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600";
    case "resigned":
      return "rounded-full border-blue-500/30 bg-blue-500/10 text-blue-600";
    case "terminated":
      return "rounded-full border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "rounded-full border-border text-muted-foreground";
  }
}

function statusLabel(status: EmployeeRecord["status"]) {
  return status === "inactive" ? "Inactive" : status.charAt(0).toUpperCase() + status.slice(1);
}

type InviteStatus =
  | { kind: "none" }
  | { kind: "used" }
  | { kind: "active"; daysAgo: number }
  | { kind: "expired"; daysAgo: number };

function inviteStatus(emp: EmployeeRecord): InviteStatus {
  // No platform user at all -> no invite to show
  if (emp.is_platform_user !== "yes" || !emp.invite_sent_at) return { kind: "none" };
  // Token was actually used to set the password -> user is active
  if (emp.invite_used_at) return { kind: "used" };

  const sent = new Date(String(emp.invite_sent_at).replace(" ", "T")).getTime();
  const now = Date.now();
  const daysAgo = Math.max(0, Math.floor((now - sent) / (1000 * 60 * 60 * 24)));

  // If not used and expired -> expired
  if (emp.invite_expires_at && new Date(String(emp.invite_expires_at).replace(" ", "T")).getTime() < now) {
    return { kind: "expired", daysAgo };
  }
  return { kind: "active", daysAgo };
}

export function EmployeeManager({
  api,
  queryKey,
  canSelectOrg,
  title,
  description,
  emptyTitle,
  emptyDescription,
  locked,
  userManagementLocked,
}: {
  api: EmployeeApi;
  queryKey: string;
  canSelectOrg: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  locked?: boolean;
  userManagementLocked?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [listMode, setListMode] = useState<"roster" | "reference">("roster");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null);
  const [toDelete, setToDelete] = useState<UUID | null>(null);
  const [toArchive, setToArchive] = useState<EmployeeRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isReferenceMode = listMode === "reference";

  const list = useQuery({
    queryKey: [queryKey, page, search, isReferenceMode],
    queryFn: () => api.list({ page, limit: 10, search, reference: isReferenceMode || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });

  const del = useMutation({
    mutationFn: (uuid: UUID) => api.remove(uuid),
    onSuccess: () => {
      toast.success("Employee deleted");
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });

  const resendInviteMut = useMutation({
    mutationFn: (uuid: UUID) => orgService.resendInvite(uuid),
    onSuccess: () => {
      toast.success("Invite resent. Fresh set-password link sent.");
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Resend failed")),
  });

  const archiveMut = useMutation({
    mutationFn: (uuid: UUID) => api.archiveReference?.(uuid) ?? Promise.reject(new Error("Not supported")),
    onSuccess: () => {
      toast.success("Employee moved to ex-employee records");
      setToArchive(null);
      invalidate();
    },
    onError: (e) => {
      toast.error(apiErrorMessage(e, "Archive failed"));
      setToArchive(null);
    },
  });

  const promoteMut = useMutation({
    mutationFn: (uuids: string[]) => orgService.promoteToPlatformUsers(uuids),
    onSuccess: (data) => {
      const promoted = data?.promoted_count ?? 0;
      const skipped = data?.skipped_count ?? 0;
      const failed = data?.results?.filter((r) => r.status === "failed") ?? [];
      if (promoted > 0) toast.success(`${promoted} employee(s) added as platform users. Set-password invites sent.`);
      if (skipped > 0) toast.info(`${skipped} employee(s) skipped — they are already platform users.`);
      if (failed.length > 0) toast.error(`${failed.length} failed: ${failed.map((f) => f.full_name ?? f.email ?? "unknown").join(", ")}`);
      setSelected(new Set());
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Adding platform users failed")),
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          !isReferenceMode ? (
            <Button
              size="sm"
              disabled={locked}
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
            >
              {locked ? <Lock className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
              {locked ? "Subscription Required" : "Add Employee"}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <ToggleGroup
          type="single"
          value={listMode}
          onValueChange={(v) => {
            if (!v) return;
            setListMode(v as "roster" | "reference");
            setPage(1);
            setSelected(new Set());
          }}
          variant="outline"
        >
          <ToggleGroupItem value="roster" className="text-sm">
            <Users className="mr-1.5 h-4 w-4" />
            Roster
          </ToggleGroupItem>
          <ToggleGroupItem value="reference" className="text-sm">
            <Archive className="mr-1.5 h-4 w-4" />
            Ex-Employees
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {!isReferenceMode && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium text-foreground">
            {selected.size} employee{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={promoteMut.isPending}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => promoteMut.mutate([...selected])}
              disabled={locked || userManagementLocked || promoteMut.isPending || selected.size === 0}
              loading={promoteMut.isPending}
            >
              {locked || userManagementLocked ? (
                <Lock className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Add as Platform User
            </Button>
          </div>
        </div>
      )}

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={isReferenceMode ? "Search ex-employee records..." : "Search by name, email, CNIC, designation or department..."}
            />
          </div>

          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={isReferenceMode ? Archive : Contact}
                title={isReferenceMode ? "No ex-employee records" : emptyTitle}
                description={isReferenceMode ? "Archived employees will appear here, keeping their documents and history." : emptyDescription}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isReferenceMode && (
                      <TableHead className="w-10">
                        {(() => {
                          const promotable = items.filter(
                            (emp) => emp.is_platform_user !== "yes" && !!emp.email && !emp.linked_user_uuid
                          );
                          const allChecked = promotable.length > 0 && promotable.every((emp) => selected.has(emp.uuid));
                          const selectionLocked = locked || userManagementLocked;
                          return (
                            <Checkbox
                              checked={allChecked}
                              disabled={promotable.length === 0 || selectionLocked}
                              onCheckedChange={(v) => {
                                if (v) setSelected(new Set(promotable.map((emp) => emp.uuid)));
                                else setSelected(new Set());
                              }}
                              aria-label="Select all promotable employees"
                            />
                          );
                        })()}
                      </TableHead>
                    )}
                    <TableHead className="w-10">S.No</TableHead>
                    <TableHead>Name</TableHead>
                    {!isReferenceMode && (
                      <>
                        <TableHead>Designation</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Platform User</TableHead>
                        <TableHead>Org Role</TableHead>
                        <TableHead>Added By</TableHead>
                      </>
                    )}
                    {isReferenceMode && (
                      <>
                        <TableHead>Status</TableHead>
                        <TableHead>Added By</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((emp, i) => {
                    const isRef = emp.record_type === "learned_reference";
                    const isActive = emp.status === "active";
                    return (
                    <TableRow key={emp.uuid}>
                      {!isReferenceMode && (
                        <TableCell data-label="Select" className="w-10">
                          {(() => {
                            const canPromote = emp.is_platform_user !== "yes" && !!emp.email && !emp.linked_user_uuid;
                            const selectionLocked = locked || userManagementLocked;
                            return (
                              <Checkbox
                                checked={selected.has(emp.uuid)}
                                disabled={!canPromote || selectionLocked}
                                onCheckedChange={(v) => {
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (v && canPromote) next.add(emp.uuid);
                                    else next.delete(emp.uuid);
                                    return next;
                                  });
                                }}
                                aria-label={`Select ${emp.full_name}`}
                                title={
                                  canPromote
                                    ? "Select to add as a platform user"
                                    : emp.is_platform_user === "yes"
                                      ? "Already a platform user"
                                      : "Add an email to this employee to invite them"
                                }
                              />
                            );
                          })()}
                        </TableCell>
                      )}
                      <TableCell data-label="S.No" className="w-10 text-muted-foreground">
                        {(page - 1) * 10 + i + 1}
                      </TableCell>
                      <TableCell data-label="Name">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{emp.full_name}</span>
                          {isRef && (
                            <Badge variant="outline" className="rounded-full border-blue-500/30 bg-blue-500/10 text-blue-600 text-[10px] font-medium whitespace-nowrap">
                              Ex-Employee
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{emp.email ?? "—"}</div>
                        {(() => {
                          const st = inviteStatus(emp);
                          if (st.kind === "none" || st.kind === "used") return null;
                          const expired = st.kind === "expired";
                          return (
                            <div
                              className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-medium ${
                                expired
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              <Mail className="h-2.5 w-2.5" />
                              {expired
                                ? `Invite expired (sent ${st.daysAgo}d ago)`
                                : `Invite sent ${st.daysAgo}d ago`}
                            </div>
                          );
                        })()}
                      </TableCell>
                      {!isReferenceMode && (
                        <>
                          <TableCell data-label="Designation" className="text-muted-foreground">
                            {emp.designation ?? "—"}
                          </TableCell>
                          <TableCell data-label="Department" className="text-muted-foreground">
                            {emp.department ?? "—"}
                          </TableCell>
                          <TableCell data-label="Status">
                            <Badge variant="outline" className={statusBadgeClass(emp.status)}>
                              {statusLabel(emp.status)}
                            </Badge>
                          </TableCell>
                          <TableCell data-label="Platform User">
                            <Badge
                              variant="outline"
                              className={
                                emp.is_platform_user === "yes"
                                  ? "rounded-full border-primary/30 bg-primary/10 text-primary"
                                  : "rounded-full border-border text-muted-foreground"
                              }
                            >
                              {emp.is_platform_user === "yes" ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell data-label="Org Role">
                            {emp.is_platform_user === "yes" && emp.linked_user_role ? (
                              <Badge
                                variant="outline"
                                className={
                                  emp.linked_user_role === "org_admin" || emp.linked_user_role === "sub_admin"
                                    ? "rounded-full border-primary/30 bg-primary/10 text-primary"
                                    : "rounded-full border-border text-muted-foreground"
                                }
                              >
                                {emp.linked_user_role === "org_admin"
                                  ? "Org Admin"
                                  : emp.linked_user_role === "sub_admin"
                                    ? "Sub Admin"
                                    : "Member"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      {isReferenceMode && (
                        <TableCell data-label="Status">
                          <Badge variant="outline" className={statusBadgeClass(emp.status)}>
                            {statusLabel(emp.status)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell data-label="Added By" className="text-muted-foreground">
                        {emp.added_by_name ?? "—"}
                      </TableCell>
                      <TableCell data-label="Actions" className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isRef && (() => {
                            const st = inviteStatus(emp);
                            if (st.kind === "active" || st.kind === "expired") {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 whitespace-nowrap px-2 text-xs"
                                  onClick={() => resendInviteMut.mutate(emp.uuid)}
                                  disabled={locked || userManagementLocked || resendInviteMut.isPending}
                                >
                                  {locked || userManagementLocked ? <Lock className="mr-1 h-3 w-3" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                                  Resend
                                </Button>
                              );
                            }
                            return null;
                          })()}
                          {!isRef && isActive && api.archiveReference && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 whitespace-nowrap px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => setToArchive(emp)}
                              disabled={locked}
                            >
                              <Archive className="mr-1 h-3 w-3" />
                              Archive
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              navigate({ to: "/org/team/$uuid", params: { uuid: emp.uuid } })
                            }
                            aria-label={`View ${emp.full_name}`}
                            title="View employee"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                total={list.data?.total ?? 0}
                totalPages={list.data?.totalPages ?? 1}
                onChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        key={editing?.uuid ?? "new"}
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        api={api}
        canSelectOrg={canSelectOrg}
        userManagementLocked={userManagementLocked}
        onDone={() => {
          setOpenForm(false);
          invalidate();
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this employee?"
        description="This will permanently remove the HR record. Employees linked to a platform user cannot be deleted."
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
      />

      <ConfirmDialog
        open={!!toArchive}
        onOpenChange={(o) => !o && setToArchive(null)}
        title="Archive as Reference?"
        description={`Move "${toArchive?.full_name ?? ""}" to ex-employee records? They will no longer appear in the active roster, but their documents and history will be preserved for future reference lookups.`}
        confirmLabel="Archive"
        destructive={false}
        onConfirm={() => {
          if (toArchive) archiveMut.mutate(toArchive.uuid);
        }}
      />
    </div>
  );
}

function EmployeeFormDialog({
  open,
  onOpenChange,
  editing,
  api,
  canSelectOrg,
  userManagementLocked,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: EmployeeRecord | null;
  api: EmployeeApi;
  canSelectOrg: boolean;
  userManagementLocked?: boolean;
  onDone: () => void;
}) {
  const isEdit = !!editing;
  const { user } = useAuth();
  const canDelete = user?.org_role === "org_admin";

  const [form, setForm] = useState({
    full_name: editing?.full_name ?? "",
    cnic: editing?.cnic ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    designation: editing?.designation ?? "",
    department: editing?.department ?? "",
    status: (editing?.status ?? "active") as EmployeeRecord["status"],
    joining_date: editing?.joining_date ?? "",
    emergency_contact: editing?.emergency_contact ?? "",
    current_salary: editing ? String(editing?.current_salary ?? "0") : "",
    organization_uuid: (editing as unknown as { organization_uuid?: string })?.organization_uuid ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const departmentsQ = useQuery({
    queryKey: ["org-departments"],
    queryFn: () => orgService.departments.list(),
    enabled: open,
  });
  const designationsQ = useQuery({
    queryKey: ["org-designations"],
    queryFn: () => orgService.designations.list(),
    enabled: open,
  });

  const [manageType, setManageType] = useState<null | "department" | "designation">(null);

  const docsQ = useQuery({
    queryKey: ["emp-docs", editing?.uuid],
    queryFn: () => orgService.employeeDocuments.list(editing!.uuid),
    enabled: !!editing?.uuid && open,
  });

  const [stagedDocs, setStagedDocs] = useState<StagedDoc[]>([]);
  const uploadDocsMut = useMutation({
    mutationFn: async () => {
      for (const d of stagedDocs) {
        const fd = new FormData();
        fd.append("documents", d.file);
        if (d.name.trim()) fd.append("document_type", d.name.trim());
        await orgService.employeeDocuments.upload(editing!.uuid, fd);
      }
    },
    onSuccess: () => {
      setStagedDocs([]);
      docsQ.refetch();
      toast.success("Documents uploaded");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Upload failed")),
  });

  const uploadStagedDocs = async (employeeUuid: string) => {
    for (const d of stagedDocs) {
      const fd = new FormData();
      fd.append("documents", d.file);
      if (d.name.trim()) fd.append("document_type", d.name.trim());
      await orgService.employeeDocuments.upload(employeeUuid, fd);
    }
  };
  const deleteDocMut = useMutation({
    mutationFn: (uuid: UUID) => orgService.employeeDocuments.remove(uuid),
    onSuccess: () => {
      docsQ.refetch();
      toast.success("Document deleted");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });

  const formatCNICInput = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Name is required";
    if (!isEdit && !form.cnic.trim()) e.cnic = "CNIC is required";
    if (form.emergency_contact.trim() && !/^[0-9+\-() ]{6,30}$/.test(form.emergency_contact.trim()))
      e.emergency_contact = "Invalid contact";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        cnic: form.cnic.replace(/\D/g, ""),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        department: form.department.trim() || undefined,
        status: form.status,
        joining_date: form.joining_date || undefined,
        emergency_contact: form.emergency_contact.trim() || undefined,
      };
      if (canSelectOrg && form.organization_uuid) {
        data.organization_uuid = form.organization_uuid;
      }
      if (!isEdit) {
        data.current_salary = form.current_salary ? Number(form.current_salary) : 0;
      }
      if (isEdit) {
        await api.update(editing.uuid, data);
        if (stagedDocs.length) {
          await uploadStagedDocs(editing.uuid);
        }
        toast.success("Employee updated");
      } else {
        const createdRes = await api.create(data);
        const newUuid = createdRes?.employee?.uuid;
        toast.success("Employee created. Use \"Add as Platform User\" from the roster to invite them.");
        if (stagedDocs.length && newUuid) {
          await uploadStagedDocs(newUuid);
        }
      }
      setStagedDocs([]);
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Save failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const orgs = useQuery({
    queryKey: ["admin-orgs-select"],
    queryFn: () => adminService.organizations({ limit: 200 }),
    enabled: canSelectOrg && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Enter full name"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CNIC {isEdit ? "" : "*"}</Label>
              <Input
                value={isEdit ? formatCNIC(form.cnic) : form.cnic}
                onChange={(e) => setForm({ ...form, cnic: isEdit ? form.cnic : formatCNICInput(e.target.value) })}
                placeholder="XXXXX-XXXXXXX-X"
                disabled={isEdit}
              />
              {errors.cnic && <p className="text-xs text-destructive">{errors.cnic}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  {userManagementLocked ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Lock className="h-3 w-3" /> Email is saved. Adding this employee as a platform user requires a plan upgrade.
                    </span>
                  ) : (
                    <>
                      Providing an email lets you later invite this employee as a platform user from the roster (select them and use <strong>"Add as Platform User"</strong>). No invite is sent automatically.
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: digitsOnly(e.target.value) })}
                placeholder="Phone number"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Emergency Contact</Label>
              <Input
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                placeholder="+92 300 0000000"
              />
              {errors.emergency_contact && (
                <p className="text-xs text-destructive">{errors.emergency_contact}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <Input
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Designation</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setManageType("designation")}
                >
                  Manage
                </button>
              </div>
              <Select value={form.designation} onValueChange={(v) => setForm({ ...form, designation: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {(designationsQ.data ?? []).map((d: ManagedOption) => (
                    <SelectItem key={d.uuid} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Department</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setManageType("department")}
                >
                  Manage
                </button>
              </div>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departmentsQ.data ?? []).map((d: ManagedOption) => (
                    <SelectItem key={d.uuid} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Current Salary</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.current_salary}
                  onChange={(e) => setForm({ ...form, current_salary: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Captured as this employee's starting salary on their salary history.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status (Lifecycle)</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmployeeRecord["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {canSelectOrg && (
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <Select
                value={form.organization_uuid}
                onValueChange={(v) => setForm({ ...form, organization_uuid: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {(orgs.data?.items ?? []).map((org: Organization) => (
                    <SelectItem key={org.uuid} value={org.uuid}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3 max-w-full">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Documents</Label>
              <span className="text-xs text-muted-foreground">
                Each file up to 10MB
              </span>
            </div>
            <EmployeeDocPicker
              docs={stagedDocs}
              onChange={setStagedDocs}
              onUpload={isEdit ? () => uploadDocsMut.mutate() : undefined}
              uploading={uploadDocsMut.isPending}
              note={
                !isEdit && stagedDocs.length > 0
                  ? `${stagedDocs.length} doc(s) selected — they will be uploaded after you save the employee.`
                  : undefined
              }
              className="max-w-full"
            />
            {isEdit && (
              <div className="space-y-1.5">
                {docsQ.isLoading && <p className="text-xs text-muted-foreground">Loading documents…</p>}
                {(docsQ.data ?? []).map((doc: EmployeeDocument) => (
                  <div key={doc.uuid} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-sm">
                    <ProtectedDocumentLink
                      storedPath={doc.file_path}
                      className="flex min-w-0 flex-1 items-center gap-2 text-primary hover:underline"
                    >
                      <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {doc.document_type && (
                          <>
                            <span className="font-medium">{doc.document_type}</span>
                            <span className="mx-1 text-muted-foreground">—</span>
                          </>
                        )}
                        {doc.file_name}
                      </span>
                      {doc.file_size ? (
                        <span className="shrink-0 text-xs text-muted-foreground">({formatFileSize(doc.file_size)})</span>
                      ) : null}
                    </ProtectedDocumentLink>
                    {canDelete ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteDocMut.mutate(doc.uuid)}
                        loading={deleteDocMut.isPending && deleteDocMut.variables === doc.uuid}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {(docsQ.data ?? []).length === 0 && !docsQ.isLoading && (
                  <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={submitting}>
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ManageOptionsDialog
        open={manageType !== null}
        onOpenChange={(o) => !o && setManageType(null)}
        type={manageType}
      />
    </Dialog>
  );
}

function ManageOptionsDialog({
  open,
  onOpenChange,
  type,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: "department" | "designation" | null;
}) {
  const qc = useQueryClient();
  const isDept = type === "department";
  const title = isDept ? "Manage Departments" : "Manage Designations";
  const { user } = useAuth();
  const canDelete = user?.org_role === "org_admin";
  const listQ = useQuery({
    queryKey: [isDept ? "org-departments" : "org-designations"],
    queryFn: () => (isDept ? orgService.departments.list() : orgService.designations.list()),
    enabled: open,
  });

  const [name, setName] = useState("");
  const createMut = useMutation({
    mutationFn: (n: string) => (isDept ? orgService.departments.create(n) : orgService.designations.create(n)),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: [isDept ? "org-departments" : "org-designations"] });
      toast.success(`${isDept ? "Department" : "Designation"} added`);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Add failed")),
  });
  const removeMut = useMutation({
    mutationFn: (uuid: UUID) => (isDept ? orgService.departments.remove(uuid) : orgService.designations.remove(uuid)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [isDept ? "org-departments" : "org-designations"] });
      toast.success("Removed");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Remove failed")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`New ${isDept ? "department" : "designation"} name`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) createMut.mutate(name.trim());
              }}
            />
            <Button onClick={() => name.trim() && createMut.mutate(name.trim())} loading={createMut.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="max-h-60 space-y-1.5 overflow-y-auto">
            {(listQ.data ?? []).map((opt: ManagedOption) => (
              <div key={opt.uuid} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-sm">
                <span className="truncate">{opt.name}</span>
                {canDelete ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMut.mutate(opt.uuid)}
                    loading={removeMut.isPending && removeMut.variables === opt.uuid}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {(listQ.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No items yet.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





