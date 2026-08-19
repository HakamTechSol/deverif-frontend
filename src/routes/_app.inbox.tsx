import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Eye, Inbox as InboxIcon, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { RequestDetailModal } from "@/components/common/RequestDetailModal";
import { StatusBadge } from "@/components/common/StatusBadge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { requestsService, notificationService, type VerificationRequest } from "@/services";
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [active, setActive] = useState<VerificationRequest | null>(null);
  const [viewing, setViewing] = useState<VerificationRequest | null>(null);

  const list = useQuery({
    queryKey: ["inbox", page, search, dateFrom, dateTo],
    queryFn: () => requestsService.myInbox({ page, limit: 10, search, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  });

  const items = list.data?.items ?? [];

  const markNotifRead = (reqUuid: string) => {
    notificationService.markReadByReference(reqUuid).then(() => {
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    });
  };

  useEffect(() => {
    if (active?.uuid) markNotifRead(active.uuid);
  }, [active?.uuid]);

  useEffect(() => {
    if (viewing?.uuid) markNotifRead(viewing.uuid);
  }, [viewing?.uuid]);

  return (
    <div>
      <PageHeader
        title="Inbox"
        description={isLocked ? "Verification actions are locked. Renew your subscription to continue." : "Verification requests other organizations have sent to your team."}
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
              placeholder="Search by requester or document…"
            />
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full sm:w-40"
              />
              <span className="text-xs text-muted-foreground max-sm:px-1">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full sm:w-40"
              />
            </div>
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
                    <TableHead>Submitted</TableHead>
                    <TableHead>Verified date</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.uuid}>
                      <TableCell data-label="Requester" className="font-medium text-foreground">
                        <div>{r.requester_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.requester_organization ?? r.requester_email}
                        </div>
                      </TableCell>
                      <TableCell data-label="Document type" className="text-muted-foreground">{r.document_type}</TableCell>
                      <TableCell data-label="Status">
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell data-label="Submitted" className="text-xs text-muted-foreground">
                        {formatDate(r.submitted_at)}
                      </TableCell>
                      <TableCell data-label="Verified date" className="text-xs text-muted-foreground">
                        {r.status === "under_review" ? "—" : formatDate(r.verified_at)}
                      </TableCell>
                      <TableCell data-label="Format" className="text-xs uppercase text-muted-foreground">
                        {r.document_format ?? "PDF"}
                      </TableCell>
                      <TableCell data-label="Actions" className="text-right">
                        <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setViewing(r)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                        </div>
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

      <RequestDetailModal request={viewing} onClose={() => setViewing(null)} />
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
  const isFinalized = request && request.status !== "under_review";

  const verify = useMutation({
    mutationFn: (status: "verified" | "unverified") =>
      requestsService.verify(request!.uuid, {
        status,
        verification_remarks: remarks,
      }),
    onSuccess: () => {
      toast.success("Decision recorded");
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {isFinalized ? "Request details" : "Review verification request"}
          </DialogTitle>
          <DialogDescription>
            {isFinalized
              ? "This request has already been finalized."
              : "Approve or reject the document with an explanatory remark."}
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <>
            {isFinalized && (
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                  request.status === "verified"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {request.status === "verified" ? (
                  <><CheckCircle2 className="h-4 w-4" /> Verified</>
                ) : (
                  <><XCircle className="h-4 w-4" /> Unverified</>
                )}
                {request.verified_at && (
                  <span className="ml-auto text-xs font-normal opacity-70">
                    {formatDateTime(request.verified_at)}
                  </span>
                )}
              </div>
            )}

            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-6">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      Document
                    </div>
                    <div className="break-words text-sm font-semibold text-foreground">
                      {request.document_type}
                    </div>
                  </div>
                  {request.document_path ? (
                    <a
                      href={resolveAssetUrl(request.document_path) ?? request.document_path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent sm:min-h-0"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <dl className="grid gap-3 text-xs sm:grid-cols-2">
                  <MetaRow label="Requester" value={request.requester_name ?? "—"} />
                  <MetaRow label="Company" value={request.requester_organization ?? "—"} />
                  <MetaRow label="Submitted" value={formatDateTime(request.submitted_at)} />
                </dl>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <Label>Requester's remarks</Label>
                  <div className="mt-1.5 min-h-16 break-words rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {request.submission_remarks || "No remarks provided."}
                  </div>
                </div>

                {isFinalized ? (
                  <div className="space-y-2">
                    <Label>Verification remarks</Label>
                    <div className="min-h-16 break-words rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      {request.verification_remarks || "No remarks provided."}
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </>
        ) : null}

        <DialogFooter className="gap-2">
          <Button className="w-full sm:w-auto" variant="outline" onClick={onClose} disabled={verify.isPending}>
            {isFinalized ? "Close" : "Cancel"}
          </Button>
          {!isFinalized && (
            <>
              <Button
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                onClick={() => verify.mutate("unverified")}
                disabled={verify.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => verify.mutate("verified")}
                disabled={verify.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
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
