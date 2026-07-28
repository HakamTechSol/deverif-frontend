import { CheckCircle2, ExternalLink, Lock, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime, resolveAssetUrl } from "@/lib/utils";
import type { VerificationRequest } from "@/services";

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xs font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function RequestDetailModal({
  request,
  onClose,
}: {
  request: VerificationRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;

  const docUrl = request.document_path
    ? resolveAssetUrl(request.document_path) ?? request.document_path
    : null;

  const isFinalized = request.status !== "under_review";

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request details</DialogTitle>
          <DialogDescription>
            Full details for this verification request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              {request.issuing_org_name && (
                <span className="text-xs font-normal opacity-70">
                  by {request.issuing_org_name}
                </span>
              )}
              {request.verified_at && (
                <span className="ml-auto text-xs font-normal opacity-70">
                  {formatDateTime(request.verified_at)}
                </span>
              )}
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Document
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {request.document_type}
                </div>
              </div>
              <StatusBadge status={request.status} />
            </div>
          </div>

          <dl className="space-y-0.5">
            <MetaRow
              label="Organization"
              value={request.issuing_org_name ?? request.unmatched_org_name ?? "—"}
            />
            {request.requester_name && (
              <MetaRow label="Requester" value={request.requester_name} />
            )}
            {request.requester_email && (
              <MetaRow label="Requester email" value={request.requester_email} />
            )}
            <MetaRow label="Submitted" value={formatDateTime(request.submitted_at)} />
            <MetaRow
              label="Verified"
              value={
                request.status === "under_review"
                  ? "Pending"
                  : formatDateTime(request.verified_at)
              }
            />
            <MetaRow
              label="Format"
              value={request.document_format?.toUpperCase() ?? "—"}
            />
            {request.submission_remarks && (
              <MetaRow label="Remarks" value={request.submission_remarks} />
            )}
            {request.verification_remarks && (
              <MetaRow label="Verification notes" value={request.verification_remarks} />
            )}
            {request.locked_by_name && (
              <div className="flex justify-between py-1">
                <dt className="text-xs text-muted-foreground">Locked by</dt>
                <dd className="inline-flex items-center gap-1 text-xs font-medium text-warning-foreground">
                  <Lock className="h-3 w-3" /> {request.locked_by_name}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {docUrl && (
            <Button asChild>
              <a href={docUrl} target="_blank" rel="noreferrer">
                View document <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
