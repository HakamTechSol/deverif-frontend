import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users as UsersIcon, Mail, UploadCloud } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { adminService, type AdminUserRecord, type UUID } from "@/services";
import { formatCNIC, resolveAssetUrl } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Dvarif Admin" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AdminUserRecord | null>(null);
  const [toDelete, setToDelete] = useState<UUID | null>(null);

  const list = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => adminService.users({ page, limit: 10, search }),
  });

  const del = useMutation({
    mutationFn: (uuid: UUID) => adminService.deleteUser(uuid),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const resendInvite = useMutation({
    mutationFn: (uuid: UUID) => adminService.resendInvite(uuid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("New invite link sent");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to resend invite"),
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage every user account on the platform."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add user
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
              placeholder="Search by name or email…"
            />
          </div>

          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={UsersIcon} title="No users" description="Add your first user to get started." />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u.uuid}>
                      <TableCell className="font-medium text-foreground">{u.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.organization_name ?? "—"}
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
                          {u.status === "inactive" ? "Invited" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.status === "inactive" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Resend invite link"
                            onClick={() => resendInvite.mutate(u.uuid)}
                            disabled={resendInvite.isPending}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing(u);
                            setOpenForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setToDelete(u.uuid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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

      <UserFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        onDone={() => {
          setOpenForm(false);
          qc.invalidateQueries({ queryKey: ["admin-users"] });
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this user?"
        description="This will permanently remove the user and revoke all their access."
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AdminUserRecord | null;
  onDone: () => void;
}) {
  const orgs = useQuery({
    queryKey: ["admin-orgs-lookup"],
    queryFn: () => adminService.organizations({ page: 1, limit: 100 }),
    enabled: open,
  });

  const [fullName, setFullName] = useState(editing?.full_name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [cnic, setCnic] = useState(editing?.cnic ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(editing?.status ?? "active");
  const [orgMode, setOrgMode] = useState<"existing" | "new">("existing");
  const [orgName, setOrgName] = useState(editing?.organization_name ?? "");
  const [newOrgType, setNewOrgType] = useState<string>("software_house");
  const [newOrgLogo, setNewOrgLogo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const orgList = orgs.data?.items ?? [];
  const selectedOrg = orgList.find((o) => o.name === orgName);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (editing) {
        await adminService.updateUser(editing.uuid, {
          full_name: fullName,
          phone,
          status,
        });
        toast.success("User updated");
      } else {
        if (!fullName || !email || !cnic) {
          toast.error("Name, email and CNIC are required");
          setSubmitting(false);
          return;
        }

        const orgPayload =
          orgMode === "existing" && selectedOrg
            ? { name: selectedOrg.name }
            : { name: orgName, organization_type: newOrgType };

        const form = new FormData();
        form.append("organization", JSON.stringify(orgPayload));
        form.append(
          "user",
          JSON.stringify({ full_name: fullName, email, phone, cnic }),
        );
        if (orgMode === "new" && newOrgLogo) {
          form.append("org_logo", newOrgLogo);
        }
        const result = await adminService.createUser(form);
        if (result._email_warning) {
          toast.warning("User created but invite email failed. Use Resend Invite to retry.");
        } else {
          toast.success("User created. Invite email sent.");
        }
      }
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editing}
              />
            </div>
            {!editing ? (
              <>
                <div className="space-y-2">
                  <Label>CNIC</Label>
                  <Input
                    value={cnic}
                    onChange={(e) => setCnic(formatCNIC(e.target.value))}
                    placeholder="35202-1234567-1"
                    maxLength={15}
                    inputMode="numeric"
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {editing ? (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {!editing ? (
            <>
              <Separator />
              <div>
                <Label className="mb-2 block">Organization</Label>
                <div className="mb-3 inline-flex rounded-md border border-border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrgMode("existing")}
                    className={
                      orgMode === "existing"
                        ? "rounded bg-accent px-3 py-1 font-medium text-foreground"
                        : "px-3 py-1 text-muted-foreground"
                    }
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgMode("new")}
                    className={
                      orgMode === "new"
                        ? "rounded bg-accent px-3 py-1 font-medium text-foreground"
                        : "px-3 py-1 text-muted-foreground"
                    }
                  >
                    Create new
                  </button>
                </div>
                {orgMode === "existing" ? (
                  <Select value={orgName} onValueChange={setOrgName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgList.map((o) => (
                        <SelectItem key={o.uuid} value={o.name}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Name</Label>
                      <Input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newOrgType}
                        onValueChange={(v) => setNewOrgType(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="software_house">Software house</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Logo</Label>
                      <label
                        htmlFor="org-logo"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-center hover:bg-muted/60"
                      >
                        <UploadCloud className="mb-1.5 h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {newOrgLogo ? newOrgLogo.name : "Upload logo (PNG or JPG)"}
                        </span>
                        <input
                          id="org-logo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setNewOrgLogo(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {editing ? "Save changes" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
