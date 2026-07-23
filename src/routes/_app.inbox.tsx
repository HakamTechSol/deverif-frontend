import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Inbox as InboxIcon, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { requestsService, type VerificationRequest } from "@/services";
import { formatDate, formatDateTime, resolveAssetUrl } from "@/lib/utils";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Dvarif" }] }),
  component: InboxPage,
});

function InboxPage() {
  const qc = useQueryClient();
  const { isLocked } = useOrgSubscription();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<VerificationRequest | null>(null);

  const list = useQuery({
    queryKey: ["inbox", page, search],
    queryFn: () => requestsService.myInbox({ page, limit: 10, search }),
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Inbox"
        description={isLocked ? "Verification actions are locked. Renew your subscription to continue." : "Verification requests other organizations have sent to your team."}
      />

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search by requester or document…"
            />
          </div>

          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={InboxIcon}
                title="Your inbox is empty"
                description="You'll see verification requests here as other organizations send them to you."
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requester</TableHead>
                    <TableHead>Document type</TableHead>
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
                        <div>{r.requester_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.requester_organization ?? r.requester_email}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.document_type}</TableCell>
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
                        {isLocked ? (
                          <Button size="sm" variant="outline" disabled>
                            <Lock className="mr-1 h-3 w-3" /> Locked
                          </Button>
                        ) : r.status === "under_review" ? (
                          <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                            Review
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {r.status === "verified" ? "Approved" : "Processed"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={list.data?.totalPages ?? 1}
                total={list.data?.total ?? 0}
                onChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <VerifyDialog
        request={active}
        onClose={() => setActive(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["inbox"] });
          qc.invalidateQueries({ queryKey: ["inbox-count"] });
          setActive(null);
        }}
      />
    </div>
  );
}

function VerifyDialog({
  request,
  onClose,
  onDone,
}: {
  request: VerificationRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [futureConcern, setFutureConcern] = useState(false);

  const verify = useMutation({
    mutationFn: (status: "verified" | "unverified") =>
      requestsService.verify(request!.uuid, {
        status,
        verification_remarks: remarks,
        organization_conserned_for_future: futureConcern ? "yes" : "no",
      }),
    onSuccess: () => {
      toast.success("Decision recorded");
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review verification request</DialogTitle>
          <DialogDescription>
            Approve or reject the document with an explanatory remark.
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Document
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {request.document_type}
                  </div>
                </div>
                {request.document_path ? (
                  <a
                    href={resolveAssetUrl(request.document_path) ?? request.document_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border bg-background text-xs text-muted-foreground">
                Document preview
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <MetaRow label="Requester" value={request.requester_name ?? "—"} />
                <MetaRow label="Company" value={request.requester_organization ?? "—"} />
                <MetaRow label="Submitted" value={formatDateTime(request.submitted_at)} />
                <MetaRow label="Priority" value={request.priority} />
              </dl>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label>Requester's remarks</Label>
                <div className="mt-1.5 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {request.submission_remarks || "No remarks provided."}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vrem">Your verification remarks</Label>
                <Textarea
                  id="vrem"
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Explain the reasoning for your decision…"
                />
              </div>

              <label className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Checkbox
                  className="mt-0.5"
                  checked={futureConcern}
                  onCheckedChange={(v) => setFutureConcern(Boolean(v))}
                />
                <span>
                  Flag this requester's organization for future concern. Admins will be
                  notified when new requests arrive from them.
                </span>
              </label>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={verify.isPending}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => verify.mutate("unverified")}
            disabled={verify.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={() => verify.mutate("verified")}
            disabled={verify.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}
