import { ArrowRight, Building2, CheckCircle2, ExternalLink, FileText, Lock, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { VerificationCertificate } from "@/components/requests/VerificationCertificate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime, resolveAssetUrl } from "@/lib/utils";
import type { VerificationRequest } from "@/services";

export function RequestDetailModal({
  request,
  onClose,
}: {
  request: VerificationRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;

  const docUrl = request.document_path
    ? (resolveAssetUrl(request.document_path) ?? request.document_path)
    : null;

  const isFinalized = request.status !== "under_review";
  const org = request.issuing_org_name ?? request.unmatched_org_name;

  const requesterLabel = request.requester_name ?? "—";
  const requesterOrg = request.requester_organization;

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0 sm:px-6">
          <DialogTitle className="text-lg">Request details</DialogTitle>
          <DialogDescription>Full details for this verification request.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4 sm:px-6">
          {/* Status banner */}
          {isFinalized && (
            <div className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium ${
              request.status === "verified"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
            >
              {request.status === "verified" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{request.status === "verified" ? "Verified" : "Unverified"}</span>
              {request.verified_at && (
                <span className="ml-auto text-xs font-normal opacity-70">
                  {formatDateTime(request.verified_at)}
                </span>
              )}
            </div>
          )}

          {/* Flow: Requester → Organization */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Request flow
            </p>
            <div className="mt-3 flex items-stretch gap-2.5">
              {/* Requester side */}
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Requested by
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 font-semibold text-foreground">
                  <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
                  <span className="truncate">{requesterOrg ?? "Unassigned organization"}</span>
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{requesterLabel}</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <ArrowRight className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
              </div>

              {/* Target org */}
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Sent to
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 font-semibold text-foreground">
                  <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
                  <span className="truncate">{org ?? "Unmatched organization"}</span>
                </p>
                {request.issuing_organization_uuid && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{request.document_type}</p>
                )}
              </div>
            </div>
          </div>

          {/* Document + Org card */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Document
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {request.document_type}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border/50 pt-3 text-xs">
              {org && (
                <div>
                  <span className="text-muted-foreground">Organization </span>
                  <span className="font-medium text-foreground">{org}</span>
                </div>
              )}
              {request.document_owner_name && (
                <div>
                  <span className="text-muted-foreground">Owner </span>
                  <span className="font-medium text-foreground">{request.document_owner_name}</span>
                </div>
              )}
              {request.document_format && (
                <div>
                  <span className="text-muted-foreground">Format </span>
                  <span className="font-medium uppercase text-foreground">
                    {request.document_format}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Submitted </span>
                <span className="font-medium text-foreground">
                  {formatDateTime(request.submitted_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Requester info */}
          {(request.requester_name || request.requester_email || request.requester_organization) && (
            <div className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
              {request.requester_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <p className="mt-0.5 font-medium text-foreground">{request.requester_name}</p>
                </div>
              )}
              {request.requester_organization && (
                <div>
                  <p className="text-xs text-muted-foreground">Requester org</p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {request.requester_organization}
                  </p>
                </div>
              )}
              {request.requester_email && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Requester email</p>
                  <p className="mt-0.5 font-medium text-foreground">{request.requester_email}</p>
                </div>
              )}
            </div>
          )}

          {/* Remarks */}
          {request.submission_remarks && (
            <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Remarks
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {request.submission_remarks}
              </p>
            </div>
          )}

          {/* Verification notes */}
          {request.verification_remarks && (
            <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verification notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {request.verification_remarks}
              </p>
            </div>
          )}

          {/* Locked warning */}
          {request.locked_by_name && request.status === "under_review" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>
                Locked by <strong>{request.locked_by_name}</strong>
              </span>
            </div>
          )}

          {/* Verification certificate */}
          {request.status === "verified" && <VerificationCertificate request={request} />}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          {docUrl && (
            <Button asChild className="w-full sm:w-auto">
              <a href={docUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                View document <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
