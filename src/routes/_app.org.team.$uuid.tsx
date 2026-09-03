import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calculator, FileUp, Mail, Phone, Pencil, Plus, Save, Trash2, Upload, UserRound, X, BriefcaseBusiness, Building2, CalendarDays, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AccessDenied } from "@/components/common/RequireOrgFeature";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orgService, orgEmployeeSalaryService, salaryComponentService, type EmployeeDocument, type EmployeeRecord, type EmployeeSalaryComponent, type SalaryComponent, type SalaryHistoryEntry, type UUID } from "@/services";
import { formatCNIC, formatDate, formatDateTime, formatFileSize, resolveAssetUrl } from "@/lib/utils";
import { DvarifLoader } from "@/components/common/DvarifLoader";

export const Route = createFileRoute("/_app/org/team/$uuid")({
  validateSearch: (search: Record<string, unknown>): { edit?: boolean; salary?: boolean } => ({
    edit: search.edit === true || undefined,
    salary: search.salary === true || undefined,
  }),
  head: () => ({ meta: [{ title: "Employee — Dvarif" }] }),
  component: EmployeeDetailPage,
});

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

function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
}

function EmployeeDetailPage() {
  const { uuid } = useParams({ from: "/_app/org/team/$uuid" });
  const search = useSearch({ from: "/_app/org/team/$uuid" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState(search.edit === true);
  const perms = usePermissions();
  if (!perms.isOrgAdmin && !perms.manage_employees) return <AccessDenied feature="manage_employees" />;

  const empQ = useQuery({
    queryKey: ["org-employee", uuid],
    queryFn: () => orgService.getEmployee(uuid),
  });
  const docsQ = useQuery({
    queryKey: ["emp-docs-detail", uuid],
    queryFn: () => orgService.employeeDocuments.list(uuid),
    enabled: !!uuid,
  });

  const emp = empQ.data;
  const docs = docsQ.data ?? [];

  const original = {
    full_name: emp?.full_name ?? "",
    email: emp?.email ?? "",
    phone: emp?.phone ?? "",
    designation: emp?.designation ?? "",
    department: emp?.department ?? "",
    status: (emp?.status ?? "active") as EmployeeRecord["status"],
    joining_date: emp?.joining_date ?? "",
    emergency_contact: emp?.emergency_contact ?? "",
  };

  const [form, setForm] = useState(original);
  const formKey = emp?.uuid;

  const isDirty = (Object.keys(original) as (keyof typeof original)[]).some(
    (k) => form[k] !== original[k]
  );

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => orgService.updateEmployee(uuid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-employee", uuid] });
      qc.invalidateQueries({ queryKey: ["org-employees"] });
      toast.success("Employee updated");
      setEditing(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Save failed")),
  });

  const save = () => {
    const data: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      designation: form.designation.trim() || undefined,
      department: form.department.trim() || undefined,
      status: form.status,
      joining_date: form.joining_date || undefined,
      emergency_contact: form.emergency_contact.trim() || undefined,
    };
    updateMut.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={emp?.full_name ?? "Employee"}
        description="Full employee record"
        actions={
          editing ? (
            <>
              <Button variant="ghost" onClick={() => { setForm(original); setEditing(false); }}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={!isDirty}
                loading={updateMut.isPending}
              >
                <Save className="mr-1.5 h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          )
        }
      />

      <Link
        to="/org/team"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Team
      </Link>

      {empQ.isLoading ? (
        <DvarifLoader />
      ) : !emp ? (
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Employee not found.
          </CardContent>
        </Card>
      ) : (
        <DisplayContent
          key={formKey}
          emp={emp}
          editing={editing}
          form={form}
          setForm={setForm}
          original={original}
        />
      )}

      {emp && (
        <DocumentsCard
          uuid={uuid}
          docs={docs}
          docsQ={docsQ}
          editing={editing}
        />
      )}

      {emp && <SalaryHistoryCard uuid={uuid} autoOpen={search.salary === true} onHistoryChange={() => qc.invalidateQueries({ queryKey: ["org-employee", uuid] })} />}

      {emp && <SalaryComponentsCard uuid={uuid} />}
    </div>
  );
}

function ProfileBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  editing,
  input,
}: {
  label: string;
  value: ReactNode;
  editing?: boolean;
  input?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-medium text-muted-foreground sm:w-40 sm:shrink-0">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-right text-sm text-foreground sm:text-left">
        {editing ? input : value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeRecord["status"] }) {
  const label =
    status === "inactive"
      ? "Inactive"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {label}
    </span>
  );
}

function statusDotClass(status: EmployeeRecord["status"]) {
  switch (status) {
    case "active":
      return "bg-success";
    case "inactive":
      return "bg-amber-500";
    case "resigned":
      return "bg-blue-500";
    case "terminated":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DisplayContent(props: { emp: EmployeeRecord; editing: boolean; form: any; setForm: (f: any) => void; original: any }) {
  const { emp, editing, form, setForm } = props;

  const initials = emp.full_name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join("") ?? "?";

  const lifecycleLabel =
    emp.status === "inactive"
      ? "Inactive"
      : emp.status.charAt(0).toUpperCase() + emp.status.slice(1);

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <Card className="overflow-hidden border-border/70 shadow-none">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="-mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar className="h-20 w-20 border-4 border-card bg-background shadow-sm">
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 sm:pb-1">
            <h1 className="text-xl font-semibold text-foreground">{emp.full_name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {emp.designation && (
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  {emp.designation}
                </span>
              )}
              {emp.designation && emp.department && <span>•</span>}
              {emp.department && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {emp.department}
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={emp.status} />
              <Badge variant="outline" className="rounded-full border-border text-muted-foreground">
                {emp.is_platform_user === "yes" ? "Platform User" : "Local Contact"}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:items-end sm:pb-1">
            {emp.email && (
              <span className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> {emp.email}
              </span>
            )}
            {emp.phone && (
              <span className="inline-flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> {emp.phone}
              </span>
            )}
            {emp.joining_date && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" /> Joined {formatDate(emp.joining_date)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal information */}
        <ProfileBlock icon={UserRound} title="Personal Information">
          <div className="divide-y divide-border/70">
            <DetailRow
              label="Full Name"
              value={emp.full_name}
              editing={editing}
              input={
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              }
            />
            <DetailRow label="CNIC" value={formatCNIC(emp.cnic)} />
            <DetailRow
              label="Email"
              value={emp.email ?? "—"}
              editing={editing}
              input={
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              }
            />
            <DetailRow
              label="Phone"
              value={emp.phone ?? "—"}
              editing={editing}
              input={
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              }
            />
            <DetailRow
              label="Emergency Contact"
              value={emp.emergency_contact ?? "—"}
              editing={editing}
              input={
                <Input
                  value={form.emergency_contact}
                  onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                />
              }
            />
          </div>
        </ProfileBlock>

        <div className="space-y-6">
          {/* Employment details */}
          <ProfileBlock icon={BriefcaseBusiness} title="Employment Details">
            <div className="divide-y divide-border/70">
              <DetailRow
                label="Designation"
                value={emp.designation ?? "—"}
                editing={editing}
                input={
                  <Input
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                }
              />
              <DetailRow
                label="Department"
                value={emp.department ?? "—"}
                editing={editing}
                input={
                  <Input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                }
              />
              <DetailRow
                label="Joining Date"
                value={formatDate(emp.joining_date)}
                editing={editing}
                input={
                  <Input
                    type="date"
                    value={form.joining_date}
                    onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                  />
                }
              />
              <DetailRow
                label="Lifecycle Status"
                value={<StatusBadge status={emp.status} />}
                editing={editing}
                input={
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({ ...form, status: v as EmployeeRecord["status"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <DetailRow label="Created" value={formatDate(emp.created_at)} />
            </div>
          </ProfileBlock>

          {/* Platform access */}
          <ProfileBlock icon={ShieldCheck} title="Platform Access">
            <div className="divide-y divide-border/70">
              <DetailRow
                label="Platform User"
                value={emp.is_platform_user === "yes" ? "Yes" : "No"}
              />
              <DetailRow
                label="Account Status"
                value={
                  emp.linked_user_status
                    ? emp.linked_user_status === "inactive"
                      ? "Invite pending"
                      : "Active"
                    : "—"
                }
              />
              <DetailRow
                label="Role"
                value={
                  emp.linked_user_role === "org_admin"
                    ? "Org Admin"
                    : emp.is_platform_user === "yes"
                      ? "Member"
                      : "—"
                }
              />
              <DetailRow label="Linked Email" value={emp.linked_user_email ?? "—"} />
              <DetailRow label="Added By" value={emp.added_by_name ?? "—"} />
            </div>
          </ProfileBlock>
        </div>
      </div>
    </div>
  );
}

function DocumentsCard({
  uuid,
  docs,
  docsQ,
  editing,
}: {
  uuid: UUID;
  docs: EmployeeDocument[];
  docsQ: { refetch: () => void; isLoading: boolean };
  editing: boolean;
}) {
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState("");
  const { user } = useAuth();
  const canDelete = user?.org_role === "org_admin";

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("documents", f));
      if (docType.trim()) fd.append("document_type", docType.trim());
      return orgService.employeeDocuments.upload(uuid, fd);
    },
    onSuccess: () => {
      setDocFiles([]);
      setDocType("");
      docsQ.refetch();
      toast.success("Documents uploaded");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Upload failed")),
  });

  const deleteMut = useMutation({
    mutationFn: (docUuid: UUID) => orgService.employeeDocuments.remove(docUuid),
    onSuccess: () => {
      docsQ.refetch();
      toast.success("Document deleted");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Documents ({docs.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">Add Documents</Label>
            <Input
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="Document type (optional, e.g. CNIC, Contract)"
              className="text-sm"
            />
            <Input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setDocFiles((prev) => [...prev, ...picked]);
                e.target.value = "";
              }}
              className="text-sm"
            />
            {docFiles.length > 0 && (
              <div className="space-y-1.5">
                {docFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(f.size)}</span>
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDocFiles((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => uploadMut.mutate(docFiles)}
                  loading={uploadMut.isPending}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload {docFiles.length} file(s)
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {docsQ.isLoading && <p className="text-xs text-muted-foreground">Loading documents…</p>}
          {docs.map((doc) => (
            <div key={doc.uuid} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-sm">
              <a
                href={resolveAssetUrl(doc.file_path)}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 truncate text-primary hover:underline"
              >
                <FileUp className="h-4 w-4 shrink-0" />
                <span className="truncate">{doc.file_name}</span>
                {doc.file_size ? (
                  <span className="ml-1 shrink-0 text-xs text-muted-foreground">({formatFileSize(doc.file_size)})</span>
                ) : doc.document_type ? (
                  <span className="ml-1 shrink-0 text-xs text-muted-foreground">({doc.document_type})</span>
                ) : null}
              </a>
              <div className="flex shrink-0 items-center gap-2">
                {doc.file_size || doc.uploaded_at ? (
                  <span className="text-xs text-muted-foreground">
                    {doc.uploaded_at ? formatDateTime(doc.uploaded_at) : formatDate(doc.created_at)}
                  </span>
                ) : null}
                {editing && canDelete && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMut.mutate(doc.uuid)}
                    loading={deleteMut.isPending && deleteMut.variables === doc.uuid}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!docsQ.isLoading && docs.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {editing ? "No documents yet. Add some above." : "No documents uploaded."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatSalaryPeriod(effectiveFrom: string, effectiveTo: string | null): string {
  const fmtMonthYear = (iso: string) => {
    const [y, m] = iso.slice(0, 7).split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  };
  if (effectiveTo) {
    return `${fmtMonthYear(effectiveFrom)} → ${fmtMonthYear(effectiveTo)}`;
  }
  return `${fmtMonthYear(effectiveFrom)} — onwards`;
}

function SalaryHistoryCard({ uuid, autoOpen = false, onHistoryChange }: { uuid: UUID; autoOpen?: boolean; onHistoryChange: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.org_role === "org_admin";
  const [incrementOpen, setIncrementOpen] = useState(autoOpen);
  const [newSalary, setNewSalary] = useState("");
  const [newEffective, setNewEffective] = useState("");
  const [editingEntry, setEditingEntry] = useState<SalaryHistoryEntry | null>(null);
  const [editSalary, setEditSalary] = useState("");
  const [editEffective, setEditEffective] = useState("");
  const [toDelete, setToDelete] = useState<SalaryHistoryEntry | null>(null);

  const historyQ = useQuery({
    queryKey: ["org-salary-history", uuid],
    queryFn: () => orgEmployeeSalaryService.history(uuid),
    enabled: !!uuid,
  });

  const invalidateHistory = () => {
    qc.invalidateQueries({ queryKey: ["org-salary-history", uuid] });
    onHistoryChange();
  };

  const incrementMut = useMutation({
    mutationFn: () =>
      orgEmployeeSalaryService.increment(uuid, {
        new_basic_salary: Number(newSalary),
        effective_from: newEffective,
      }),
    onSuccess: () => {
      toast.success("Salary incremented — previous period preserved");
      invalidateHistory();
      setIncrementOpen(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Increment failed")),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      orgEmployeeSalaryService.update(uuid, editingEntry!.uuid, {
        basic_salary: editSalary ? Number(editSalary) : undefined,
        effective_from: editEffective || undefined,
      }),
    onSuccess: () => {
      toast.success("Salary history updated");
      invalidateHistory();
      setEditingEntry(null);
      setEditSalary("");
      setEditEffective("");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Update failed")),
  });

  const deleteMut = useMutation({
    mutationFn: () => orgEmployeeSalaryService.remove(uuid, toDelete!.uuid),
    onSuccess: () => {
      toast.success("Salary history record deleted");
      invalidateHistory();
      setToDelete(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });

  const openEdit = (h: SalaryHistoryEntry) => {
    setEditingEntry(h);
    setEditSalary(String(Number(h.basic_salary)));
    setEditEffective(h.effective_from);
  };

  const history = historyQ.data ?? [];

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Salary History</CardTitle>
          <Button size="sm" onClick={() => setIncrementOpen(true)}>
            Increment Salary
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {historyQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading salary history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No salary history yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Effective Period</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.uuid}>
                  <TableCell className="font-medium">{h.year}</TableCell>
                  <TableCell>
                    Rs. {Number(h.basic_salary).toLocaleString("en-PK")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatSalaryPeriod(h.effective_from, h.effective_to)}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(h)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setToDelete(h)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={incrementOpen} onOpenChange={(o) => !o && setIncrementOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Increment Salary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New Basic Salary</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={newEffective}
                onChange={(e) => setNewEffective(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The current salary period will be closed and a new period with the new amount will
              start — your salary history is preserved.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIncrementOpen(false)} disabled={incrementMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => incrementMut.mutate()}
              disabled={Number(newSalary) <= 0 || !newEffective || incrementMut.isPending}
              loading={incrementMut.isPending}
            >
              Increment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEntry} onOpenChange={(o) => !o && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Salary Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Basic Salary</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={editEffective}
                onChange={(e) => setEditEffective(e.target.value)}
              />
            </div>
            {editingEntry?.effective_to === null ? (
              <p className="text-xs text-muted-foreground">
                This is the current active salary. Changing the effective date will adjust the
                previous period automatically.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingEntry(null)} disabled={updateMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMut.mutate()}
              disabled={Number(editSalary) < 0 || updateMut.isPending}
              loading={updateMut.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this salary record?"
        description={
          toDelete?.effective_to === null
            ? "The current active salary cannot be deleted. Edit it or use Increment Salary instead."
            : "This removes the salary period. The previous period will be extended to cover the gap."
        }
        onConfirm={() => toDelete && deleteMut.mutate()}
      />
    </Card>
  );
}

function ComponentTypeBadge({ type }: { type: "allowance" | "deduction" }) {
  return (
    <Badge
      variant="outline"
      className={
        type === "allowance"
          ? "rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "rounded-full border-rose-500/30 bg-rose-500/10 text-rose-600"
      }
    >
      {type === "allowance" ? "Allowance" : "Deduction"}
    </Badge>
  );
}

function formatAmount(amount: string | number) {
  return `Rs. ${Number(amount).toLocaleString("en-PK")}`;
}

function SalaryComponentsCard({ uuid }: { uuid: UUID }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.org_role === "org_admin" || user?.org_role === "sub_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [compId, setCompId] = useState("");
  const [amount, setAmount] = useState("");
  const [editingAssign, setEditingAssign] = useState<EmployeeSalaryComponent | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [toDelete, setToDelete] = useState<EmployeeSalaryComponent | null>(null);

  const assignQ = useQuery({
    queryKey: ["org-employee-salary-components", uuid],
    queryFn: () => orgEmployeeSalaryService.components(uuid),
    enabled: !!uuid,
  });
  const catalogQ = useQuery({
    queryKey: ["org-salary-components"],
    queryFn: () => salaryComponentService.list(),
    enabled: canManage,
  });

  const assignments = assignQ.data ?? [];
  const catalog = catalogQ.data ?? [];

  const assignedIds = new Set(assignments.map((a) => a.salary_component_id));
  const available = catalog.filter((c) => !assignedIds.has(c.id));
  const selectedCatalog = catalog.find((c) => String(c.id) === compId);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["org-employee-salary-components", uuid] });

  const addMut = useMutation({
    mutationFn: () =>
      orgEmployeeSalaryService.assignComponent(uuid, {
        salary_component_id: Number(compId),
        amount: Number(amount),
      }),
    onSuccess: () => {
      toast.success("Component assigned");
      invalidate();
      setAddOpen(false);
      setCompId("");
      setAmount("");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to assign component")),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      orgEmployeeSalaryService.updateComponent(uuid, editingAssign!.uuid, {
        amount: Number(editAmount),
      }),
    onSuccess: () => {
      toast.success("Component updated");
      invalidate();
      setEditingAssign(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Update failed")),
  });

  const removeMut = useMutation({
    mutationFn: () => orgEmployeeSalaryService.removeComponent(uuid, toDelete!.uuid),
    onSuccess: () => {
      toast.success("Component removed");
      invalidate();
      setToDelete(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Remove failed")),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (assignment: EmployeeSalaryComponent) =>
      orgEmployeeSalaryService.updateComponent(uuid, assignment.uuid, {
        is_active: !assignment.is_active,
      }),
    onSuccess: () => {
      toast.success("Component status updated");
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Status update failed")),
  });

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Salary Components</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => { setCompId(""); setAmount(""); setAddOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Component
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {assignQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading salary components...</p>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Calculator className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No allowances or deductions assigned to this employee yet.
            </p>
            {canManage ? (
              <p className="text-xs text-muted-foreground">
                Use "Add Component" to assign an individual allowance/deduction with this
                employee's own amount.
              </p>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.uuid} className={a.is_active ? undefined : "opacity-60"}>
                  <TableCell className="font-medium text-foreground">{a.name}</TableCell>
                  <TableCell>
                    <ComponentTypeBadge type={a.type} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {a.component_is_percentage
                      ? `${Number(a.amount)}%`
                      : formatAmount(a.amount)}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!a.is_active}
                          disabled={toggleActiveMut.isPending}
                          onCheckedChange={() => toggleActiveMut.mutate(a)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {a.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingAssign(a); setEditAmount(String(Number(a.amount))); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setToDelete(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Component */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Component</Label>
              <Select value={compId} onValueChange={(v) => { setCompId(v); setAmount(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an allowance or deduction" />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No unassigned components available.
                    </div>
                  ) : (
                    available.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} — {c.type === "allowance" ? "Allowance" : "Deduction"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedCatalog ? (
              <div className="space-y-1.5">
                <Label>Amount for this employee</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={
                    selectedCatalog.is_percentage
                      ? "% of basic salary"
                      : "0.00"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {selectedCatalog.is_percentage
                    ? "Calculated as a percentage of the employee's basic salary."
                    : "Enter the fixed amount for this employee."}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={addMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => addMut.mutate()}
              disabled={!compId || Number(amount) < 0 || !amount || addMut.isPending}
              loading={addMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit amount */}
      <Dialog open={!!editingAssign} onOpenChange={(o) => !o && setEditingAssign(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {editingAssign?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Amount for this employee</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder={editingAssign?.component_is_percentage ? "% of basic salary" : "0.00"}
              />
              <p className="text-xs text-muted-foreground">
                {editingAssign?.component_is_percentage
                  ? "Calculated as a percentage of the employee's basic salary."
                  : "The individual amount assigned to this employee."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAssign(null)} disabled={updateMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMut.mutate()}
              disabled={Number(editAmount) < 0 || !editAmount || updateMut.isPending}
              loading={updateMut.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove "${toDelete?.name ?? ""}"?`}
        description="This removes this allowance/deduction assignment for this employee. Already-generated payroll is not affected."
        onConfirm={() => toDelete && removeMut.mutate()}
      />
    </Card>
  );
}
