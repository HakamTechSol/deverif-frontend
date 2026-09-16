import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Eye, Hourglass, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { adminService, type VerificationRequest } from "@/services";
import { formatDate, formatDateTime, resolveAssetUrl } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/unresponsive")({
  head: () => ({ meta: [{ title: "Unresponsive Requests — Dverif Admin" }] }),
  component: UnresponsivePage,
});

const PAGE_SIZE = 20;

function UnresponsivePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<VerificationRequest | null>(null);
  const [remarks, setRemarks] = useState("");

  const q = useQuery({
    queryKey: ["sla-requests", page, search],
    queryFn: () => adminService.slaRequests({ page, limit: PAGE_SIZE, search }),
  });

  const verify = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: "verified" | "unverified" }) =>
      adminService.slaVerify(uuid, { status, verification_remarks: remarks }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["sla-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["myRequests"] });
      setReviewing(null);
      setRemarks("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  const items = q.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Unresponsive requests"
        description="Requests left 'under review' for 3+ days by a registered organization. Resolve them directly or contact the organization."
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
              placeholder="Search by requester, document type, or organization…"
            />
          </div>

          {q.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Hourglass}
                title="Nothing flagged"
                description="No requests are past the 3-day SLA. New flags appear here automatically."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">S.No</TableHead>
                      <TableHead className="whitespace-nowrap">Requester</TableHead>
                      <TableHead className="whitespace-nowrap">Document</TableHead>
                      <TableHead className="whitespace-nowrap">Organization</TableHead>
                      <TableHead className="whitespace-nowrap">Submitted</TableHead>
                      <TableHead className="whitespace-nowrap">Flagged</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r, i) => {
                      const docUrl = r.document_path
                        ? (resolveAssetUrl(r.document_path) ?? r.document_path)
                        : null;
                      return (
                        <TableRow key={r.uuid}>
                          <TableCell data-label="S.No" className="w-10 text-muted-foreground">
                            {(page - 1) * 20 + i + 1}
                          </TableCell>
                          <TableCell data-label="Requester" className="whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">
                              {r.requester_name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.requester_email ?? ""}
                            </div>
                          </TableCell>
                          <TableCell data-label="Document" className="whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{r.document_type}</div>
                            <div className="text-xs text-muted-foreground">
                              <StatusBadge status={r.status} />
                            </div>
                          </TableCell>
                          <TableCell data-label="Organization" className="whitespace-nowrap text-sm text-foreground">
                            {r.issuing_org_name ?? "—"}
                          </TableCell>
                          <TableCell data-label="Submitted" className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(r.submitted_at)}
                          </TableCell>
                          <TableCell data-label="Flagged" className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDateTime(r.sla_flagged_at)}
                          </TableCell>
                          <TableCell data-label="Actions" className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {docUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                  asChild
                                >
                                  <a href={docUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 shrink-0 text-xs"
                                onClick={() => {
                                  setReviewing(r);
                                  setRemarks("");
                                }}
                              >
                                <Eye className="mr-1 h-3 w-3" /> Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={page}
                total={q.data?.total ?? 0}
                totalPages={q.data?.totalPages ?? 1}
                onChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review unresponsive request</DialogTitle>
            <DialogDescription>
              This request exceeded the 3-day SLA. Approve or reject it on behalf of the
              organization.
            </DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="font-medium text-foreground">{reviewing.document_type}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  by {reviewing.requester_name ?? "—"} · {formatDateTime(reviewing.submitted_at)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Organization: {reviewing.issuing_org_name ?? "—"}
                </div>
              </div>
              {reviewing.submission_remarks && (
                <div>
                  <Label>Requester's remarks</Label>
                  <div className="mt-1 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {reviewing.submission_remarks}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="sla-remarks">Your verification remarks</Label>
                <Textarea
                  id="sla-remarks"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Reason for your decision…"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewing(null)}
              disabled={verify.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                reviewing && verify.mutate({ uuid: reviewing.uuid, status: "unverified" })
              }
              disabled={verify.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button
              onClick={() =>
                reviewing && verify.mutate({ uuid: reviewing.uuid, status: "verified" })
              }
              disabled={verify.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
