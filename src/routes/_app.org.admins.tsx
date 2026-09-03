import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MoreVertical, Plus, ShieldCheck, ShieldOff, Trash2, Pencil } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { authStore } from "@/lib/auth";
import { orgService, type OrgAdminUserRecord, type UUID } from "@/services";
import { formatCNIC, parseFeatureAccess } from "@/lib/utils";

export const Route = createFileRoute("/_app/org/admins")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = authStore.get().user;
    if (!user || user.role !== "user" || user.org_role !== "org_admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: OrgAdminsPage,
});

type ElevatedKey = "manage_employees" | "generate_request" | "approve_request";

const ELEVATED_PERMISSIONS: { key: ElevatedKey; label: string; description: string }[] = [
  {
    key: "manage_employees",
    label: "Manage Employees",
    description: "Create, edit and view employees in My Team",
  },
  {
    key: "generate_request",
    label: "Generate Request",
    description: "Create new document verification requests",
  },
  {
    key: "approve_request",
    label: "Approve Request",
    description: "Review, verify and reject inbox verification requests",
  },
];

function elevatedAccess(u?: OrgAdminUserRecord["feature_access"]) {
  const fa = parseFeatureAccess(u);
  return {
    manage_employees: fa.manage_employees,
    generate_request: fa.generate_request,
    approve_request: fa.approve_request,
  };
}

function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
}

function OrgAdminsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<OrgAdminUserRecord | null>(null);
  const [revoking, setRevoking] = useState<{
    uuid: UUID;
    name: string;
    action: "demote" | "deactivate";
  } | null>(null);

  const list = useQuery({
    queryKey: ["org-admin-users", page, search],
    queryFn: () => orgService.adminUsers.list({ page, limit: 10, search }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["org-admin-users"] });

  const revokeMut = useMutation({
    mutationFn: ({ uuid, action }: { uuid: UUID; action: "demote" | "deactivate" }) =>
      orgService.adminUsers.revoke(uuid, action),
    onSuccess: (_d, variables) => {
      toast.success(
        variables.action === "deactivate" ? "Sub-admin deactivated" : "Sub-admin demoted to member",
      );
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Revoke failed")),
  });

  const updatePerfMut = useMutation({
    mutationFn: ({
      uuid,
      feature_access,
    }: {
      uuid: UUID;
      feature_access: Record<ElevatedKey, boolean>;
    }) => orgService.adminUsers.update(uuid, feature_access),
    onSuccess: () => {
      toast.success("Sub-admin permissions updated");
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Update failed")),
  });

  const items = list.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.orgAdmins")}
        description="Manage sub-admin accounts for your organization. Sub-admins are members with admin-configurable permissions — they never get full Org Admin power."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setOpenForm(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Sub-Admin
          </Button>
        }
      />

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search by name, email, CNIC or phone…"
            />
          </div>

          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ShieldCheck}
                title="No sub-admins"
                description="Add your first sub-admin to delegate verification and employee-management tasks safely."
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">S.No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u, i) => {
                    const perms = elevatedAccess(u.feature_access);
                    const granted = ELEVATED_PERMISSIONS.filter((p) => perms[p.key]);
                    return (
                      <TableRow key={u.uuid}>
                        <TableCell className="w-10 text-muted-foreground">
                          {(page - 1) * 10 + i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{u.full_name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.status === "inactive"
                                ? "rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600"
                                : "rounded-full border-success/30 bg-success/10 text-success"
                            }
                          >
                            {u.status === "inactive" ? "Invite pending" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {granted.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {granted.map((p) => (
                                <Badge
                                  key={p.key}
                                  variant="outline"
                                  className="rounded-full border-primary/30 bg-primary/10 text-primary"
                                >
                                  {p.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.created_at ? new Date(String(u.created_at).replace(" ", "T")).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Sub-admin actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setEditing(u)}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setRevoking({ uuid: u.uuid, name: u.full_name, action: "demote" })
                              }
                            >
                              <ShieldOff className="mr-2 h-4 w-4" /> Demote to Member
                            </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setRevoking({ uuid: u.uuid, name: u.full_name, action: "deactivate" })
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Deactivate Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <CreateSubAdminDialog
        open={openForm}
        onOpenChange={setOpenForm}
        onDone={() => {
          setOpenForm(false);
          invalidate();
        }}
      />

      <EditSubAdminPermissionsDialog
        subAdmin={editing}
        onOpenChange={() => setEditing(null)}
        onSubmit={({ uuid, feature_access }) => updatePerfMut.mutateAsync({ uuid, feature_access })}
        submitting={updatePerfMut.isPending}
        onDone={() => setEditing(null)}
      />

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={revoking?.action === "deactivate" ? "Deactivate this sub-admin?" : "Demote this sub-admin?"}
        description={
          revoking?.action === "deactivate"
            ? `${revoking?.name} will lose the ability to log in immediately. Their sub-admin permissions remain stored but the account is disabled.`
            : `${revoking?.name} will become a regular member with default permissions. No elevated permission will survive the demotion.`
        }
        confirmLabel={revoking?.action === "deactivate" ? "Deactivate" : "Demote"}
        onConfirm={() => {
          if (revoking) revokeMut.mutate(revoking);
          setRevoking(null);
        }}
      />
    </div>
  );
}

function FeatureCheckboxes({
  value,
  onChange,
}: {
  value: Record<ElevatedKey, boolean>;
  onChange: (v: Record<ElevatedKey, boolean>) => void;
}) {
  return (
    <div className="space-y-2">
      {ELEVATED_PERMISSIONS.map((p) => (
        <label key={p.key} className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={value[p.key]}
            onChange={(e) => onChange({ ...value, [p.key]: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span>
            {p.label}
            <span className="block text-xs text-muted-foreground/70">{p.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

const EMPTY_ELEVATED: Record<ElevatedKey, boolean> = {
  manage_employees: false,
  generate_request: false,
  approve_request: false,
};

function EditSubAdminPermissionsDialog({
  subAdmin,
  onOpenChange,
  onSubmit,
  submitting,
  onDone,
}: {
  subAdmin: OrgAdminUserRecord | null;
  onOpenChange: () => void;
  onSubmit: (vars: {
    uuid: UUID;
    feature_access: Record<ElevatedKey, boolean>;
  }) => Promise<unknown>;
  submitting: boolean;
  onDone: () => void;
}) {
  const [access, setAccess] = useState<Record<ElevatedKey, boolean>>(EMPTY_ELEVATED);
  const [seedKey, setSeedKey] = useState("");

  // Seed the checkboxes from the selected sub-admin whenever it changes.
  const key = subAdmin?.uuid ?? "";
  if (key !== seedKey) {
    setSeedKey(key);
    setAccess(elevatedAccess(subAdmin?.feature_access));
  }

  const submit = async () => {
    if (!subAdmin) return;
    try {
      await onSubmit({ uuid: subAdmin.uuid, feature_access: access });
      toast.success("Sub-admin permissions updated");
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Update failed"));
    }
  };

  return (
    <Dialog open={!!subAdmin} onOpenChange={(v) => !v && onOpenChange()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Permissions — {subAdmin?.full_name ?? "Sub-admin"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {subAdmin && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{subAdmin.email}</span> &nbsp;·&nbsp;
              Role: Sub-admin
            </p>
          )}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">Permissions</Label>
            <p className="text-xs text-muted-foreground">
              Sub-admins gain exactly the permissions you grant here. Changes take effect immediately.
            </p>
            <FeatureCheckboxes value={access} onChange={setAccess} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onOpenChange} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} disabled={!subAdmin}>
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSubAdminDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [access, setAccess] = useState<Record<ElevatedKey, boolean>>(EMPTY_ELEVATED);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "A valid email is required";
    if (!/^\d{13}$/.test(cnic.replace(/\D/g, ""))) e.cnic = "A valid 13-digit CNIC is required";
    if (phone && !/^[0-9+\-() ]{6,30}$/.test(phone)) e.phone = "Invalid phone number";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const res = await orgService.adminUsers.create({
        full_name: fullName.trim(),
        email: email.trim(),
        cnic: cnic.replace(/\D/g, ""),
        phone: phone.trim() || undefined,
        feature_access: access,
      });
      if (res._email_warning) toast.warning(res._email_warning);
      else toast.success("Sub-admin created. Set-password email sent.");
      setFullName("");
      setEmail("");
      setCnic("");
      setPhone("");
      setAccess(EMPTY_ELEVATED);
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Create failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Sub-Admin</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>CNIC *</Label>
            <Input
              value={cnic}
              onChange={(e) => setCnic(formatCNIC(e.target.value))}
              placeholder="XXXXX-XXXXXXX-X"
              maxLength={15}
              inputMode="numeric"
            />
            {errors.cnic && <p className="text-xs text-destructive">{errors.cnic}</p>}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">Permissions</Label>
            <p className="text-xs text-muted-foreground">
              Sub-admins never get full Org Admin power — they gain exactly the permissions you grant here.
            </p>
            <FeatureCheckboxes value={access} onChange={setAccess} />
          </div>

          <p className="text-xs text-muted-foreground">
            A “Set your password” email is sent automatically to the address above.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create Sub-Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
