import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2, UploadCloud, FileCheck2, Pencil, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { requestsService, type VerificationRequest, type UUID } from "@/services";
import { formatDate, resolveAssetUrl } from "@/lib/utils";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_app/requests")({
  head: () => ({ meta: [{ title: "My Requests — Dvarif" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const qc = useQueryClient();
  const { isLocked } = useOrgSubscription();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<VerificationRequest | null>(null);
  const [toDelete, setToDelete] = useState<UUID | null>(null);

  const list = useQuery({
    queryKey: ["myRequests", page, search],
    queryFn: () => requestsService.mySent({ page, limit: 10, search }),
  });

  const del = useMutation({
    mutationFn: (uuid: UUID) => requestsService.deleteSent(uuid),
    onSuccess: () => {
      toast.success("Request deleted");
      qc.invalidateQueries({ queryKey: ["myRequests"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const items = list.data?.items ?? [];
  const totalPages = list.data?.totalPages ?? 1;
  const total = list.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="My verification requests"
        description={isLocked ? "Request creation is locked. Renew your subscription to continue." : "Requests you've submitted to other organizations in the network."}
        actions={
          isLocked ? (
            <Button disabled variant="outline">
              <Lock className="mr-2 h-4 w-4" /> Subscription Required
            </Button>
          ) : (
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> New request
            </Button>
          )
        }
      />

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search by document or organization…"
            />
          </div>

          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No requests yet"
                description={isLocked ? "Renew your subscription to create verification requests." : "Submit your first verification request to an organization in the network."}
                action={
                  isLocked ? (
                    <Button disabled variant="outline">
                      <Lock className="mr-2 h-4 w-4" /> Subscription Required
                    </Button>
                  ) : (
                    <Button onClick={() => setOpenCreate(true)}>
                      <Plus className="mr-2 h-4 w-4" /> New request
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document type</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.uuid}>
                      <TableCell className="font-medium text-foreground">
                        {r.document_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.issuing_org_name ?? (
                          <span className="italic">
                            {r.other_organization_name ?? "—"} (unmatched)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={r.priority} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(r.submitted_at)}
                      </TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">
                        {r.document_format ?? "PDF"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "under_review" && !isLocked && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditing(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setToDelete(r.uuid)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <CreateRequestDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["myRequests"] });
          setOpenCreate(false);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this request?"
        description="This will permanently remove the request. This action cannot be undone."
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
      />

      <EditRequestDialog
        request={editing}
        onOpenChange={() => setEditing(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["myRequests"] });
          setEditing(null);
        }}
      />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function CreateRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const orgs = useQuery({
    queryKey: ["orgs-for-request"],
    queryFn: () => requestsService.organizations(),
    enabled: open,
  });

  const [documentType, setDocumentType] = useState("");
  const [orgUuid, setOrgUuid] = useState<string>("");
  const [otherOrgName, setOtherOrgName] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOther = orgUuid === "__other__";

  const orgOptions = useMemo(() => orgs.data ?? [], [orgs.data]);

  const submit = async () => {
    if (!documentType.trim()) return toast.error("Document type is required");
    if (!file) return toast.error("Attach a document");
    if (!orgUuid) return toast.error("Select an issuing organization");
    if (isOther && !otherOrgName.trim())
      return toast.error("Enter the organization name");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("document_type", documentType);
      form.append("priority", priority);
      form.append("submission_remarks", remarks);
      form.append("document", file);
      if (isOther) {
        form.append("issuing_organization_uuid", "");
        form.append("other_organization_name", otherOrgName);
      } else {
        form.append("issuing_organization_uuid", orgUuid);
      }
      await requestsService.create(form);
      toast.success("Request submitted");
      setDocumentType("");
      setOrgUuid("");
      setOtherOrgName("");
      setPriority("normal");
      setRemarks("");
      setFile(null);
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New verification request</DialogTitle>
          <DialogDescription>
            Send a document to another organization in the Dvarif network for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document type</Label>
            <Input
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder="e.g. Employment letter, Degree transcript"
            />
          </div>

          <div className="space-y-2">
            <Label>Issuing organization</Label>
            <Select value={orgUuid} onValueChange={setOrgUuid}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {orgOptions.map((o) => (
                  <SelectItem key={o.uuid} value={o.uuid}>
                    {o.name}
                  </SelectItem>
                ))}
                <SelectItem value="__other__">Other (not listed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOther ? (
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input
                value={otherOrgName}
                onChange={(e) => setOtherOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
              <p className="text-xs text-muted-foreground">
                Our admin team will attempt to onboard this organization for review.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Document</Label>
            <label
              htmlFor="doc-file"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center hover:bg-muted/60"
            >
              <UploadCloud className="mb-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : "Click to upload or drag & drop"}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                PDF or JPEG · Max 10MB
              </span>
              <input
                id="doc-file"
                type="file"
                accept="application/pdf,image/jpeg"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label>Remarks (optional)</Label>
            <Textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any context that will help the reviewer…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRequestDialog({
  request,
  onOpenChange,
  onDone,
}: {
  request: VerificationRequest | null;
  onOpenChange: () => void;
  onDone: () => void;
}) {
  const orgs = useQuery({
    queryKey: ["orgs-for-request"],
    queryFn: () => requestsService.organizations(),
    enabled: !!request,
  });

  const [documentType, setDocumentType] = useState("");
  const [orgUuid, setOrgUuid] = useState<string>("");
  const [otherOrgName, setOtherOrgName] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOther = orgUuid === "__other__";
  const orgOptions = useMemo(() => orgs.data ?? [], [orgs.data]);

  const open = !!request;

  // Pre-fill when request changes
  useMemo(() => {
    if (request) {
      setDocumentType(request.document_type);
      setPriority(request.priority as "normal" | "urgent");
      setRemarks(request.submission_remarks ?? "");
      setOtherOrgName(request.other_organization_name ?? "");
      setFile(null);
      if (request.issuing_organization_uuid) {
        setOrgUuid(request.issuing_organization_uuid);
      } else if (request.other_organization_name) {
        setOrgUuid("__other__");
      } else {
        setOrgUuid("");
      }
    }
  }, [request?.uuid]);

  const submit = async () => {
    if (!request) return;
    if (!documentType.trim()) return toast.error("Document type is required");
    if (!orgUuid) return toast.error("Select an issuing organization");
    if (isOther && !otherOrgName.trim())
      return toast.error("Enter the organization name");

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("document_type", documentType);
      form.append("priority", priority);
      form.append("submission_remarks", remarks);
      if (isOther) {
        form.append("issuing_organization_uuid", "");
        form.append("other_organization_name", otherOrgName);
      } else {
        form.append("issuing_organization_uuid", orgUuid);
      }
      if (file) {
        form.append("document", file);
      }
      await requestsService.updateSent(request.uuid, form);
      toast.success("Request updated");
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit verification request</DialogTitle>
          <DialogDescription>
            Update the details of your request before it's reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document type</Label>
            <Input
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder="e.g. Employment letter, Degree transcript"
            />
          </div>

          <div className="space-y-2">
            <Label>Issuing organization</Label>
            <Select value={orgUuid} onValueChange={setOrgUuid}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {orgOptions.map((o) => (
                  <SelectItem key={o.uuid} value={o.uuid}>
                    {o.name}
                  </SelectItem>
                ))}
                <SelectItem value="__other__">Other (not listed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOther ? (
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input
                value={otherOrgName}
                onChange={(e) => setOtherOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Document{file ? "" : " (optional — re-upload to replace)"}</Label>
            {request?.document_path && !file && (
              <a
                href={resolveAssetUrl(request.document_path) ?? request.document_path}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground hover:bg-muted/60"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Current document ({request.document_format ?? "file"})</span>
                <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            )}
            <label
              htmlFor="edit-doc-file"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center hover:bg-muted/60"
            >
              <UploadCloud className="mb-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : "Click to upload or drag & drop"}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                PDF or JPEG · Max 10MB
              </span>
              <input
                id="edit-doc-file"
                type="file"
                accept="application/pdf,image/jpeg"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label>Remarks (optional)</Label>
            <Textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any context that will help the reviewer…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Pencil className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
