import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Pencil, Plus, ShieldCheck, Trash2, UploadCloud, CreditCard } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { adminService, type Organization, type UUID } from "@/services";
import { formatDate, resolveAssetUrl } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/organizations")({
  head: () => ({ meta: [{ title: "Organizations — Dvarif Admin" }] }),
  component: AdminOrgsPage,
});

function AdminOrgsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [toDelete, setToDelete] = useState<UUID | null>(null);

  const list = useQuery({
    queryKey: ["admin-orgs", page, search],
    queryFn: () => adminService.organizations({ page, limit: 10, search }),
  });

  const del = useMutation({
    mutationFn: (uuid: UUID) => adminService.deleteOrganization(uuid),
    onSuccess: () => {
      toast.success("Organization deleted");
      qc.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="The verified organizations in the Dvarif network."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add organization
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
              placeholder="Search organizations…"
            />
          </div>
          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Building2} title="No organizations" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((o) => (
                    <TableRow key={o.uuid}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          {o.logo ? (
                            <img
                              src={resolveAssetUrl(o.logo)}
                              className="h-8 w-8 rounded-md border border-border object-cover"
                              alt={o.name}
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Building2 className="h-4 w-4" />
                            </div>
                          )}
                          {o.name}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {o.organization_type?.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        {o.verified === "yes" ? (
                          <Badge className="rounded-full border-success/30 bg-success/10 text-success" variant="outline">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <OrgSubscriptionBadge org={o} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(o.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing(o);
                            setOpenForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setToDelete(o.uuid)}
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

      <OrgFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        onDone={() => {
          setOpenForm(false);
          qc.invalidateQueries({ queryKey: ["admin-orgs"] });
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete organization?"
        description="This will also affect users and requests linked to this organization."
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function OrgFormDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Organization | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Organization["organization_type"]>("software_house");
  const [verified, setVerified] = useState(true);
  const [logo, setLogo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setType((editing?.organization_type as any) ?? "software_house");
      setVerified(editing?.verified === "yes");
      setLogo(null);
    }
  }, [open, editing]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("verified", verified ? "yes" : "no");
      form.append("organization_type", type);
      if (logo) form.append("logo", logo);
      if (editing) {
        await adminService.updateOrganization(editing.uuid, form);
        toast.success("Organization updated");
      } else {
        await adminService.createOrganization(form);
        toast.success("Organization created");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit organization" : "Add organization"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
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
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label className="mb-0">Verified</Label>
              <p className="text-xs text-muted-foreground">
                Visible in the requester's organization dropdown.
              </p>
            </div>
            <Switch checked={verified} onCheckedChange={setVerified} />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            {(editing?.logo && !logo) ? (
              <div className="relative flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 px-4 py-5 text-center">
                <img
                  src={resolveAssetUrl(editing.logo)}
                  alt={editing.name}
                  className="mb-2 h-16 w-16 rounded-md border border-border object-cover"
                />
                <label
                  htmlFor="org-logo"
                  className="cursor-pointer text-xs font-medium text-primary hover:underline"
                >
                  Replace logo
                </label>
                <input
                  id="org-logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <label
                htmlFor="org-logo"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 text-center hover:bg-muted/60"
              >
                <UploadCloud className="mb-1.5 h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {logo ? logo.name : "Upload logo (PNG or JPG)"}
                </span>
                <input
                  id="org-logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrgSubscriptionBadge({ org }: { org: Organization }) {
  if (org.subscription_status === "active" && org.subscription_expiry) {
    const expiryDate = new Date(String(org.subscription_expiry).replace(" ", "T"));
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <Badge className="rounded-full border-success/30 bg-success/10 text-success" variant="outline">
        <CreditCard className="mr-1 h-3 w-3" />
        Active
        <span className="ml-1 text-xs font-normal">({daysLeft}d)</span>
      </Badge>
    );
  }
  if (org.subscription_status === "expired") {
    return (
      <Badge className="rounded-full border-destructive/30 bg-destructive/10 text-destructive" variant="outline">
        <CreditCard className="mr-1 h-3 w-3" /> Expired
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full text-muted-foreground">
      No subscription
    </Badge>
  );
}
