import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PriorityBadge } from "@/components/common/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { adminService, type VerificationRequest } from "@/services";

export const Route = createFileRoute("/_app/admin/null-requests")({
  head: () => ({ meta: [{ title: "Unmatched Organizations — Dvarif Admin" }] }),
  component: NullRequestsPage,
});

function NullRequestsPage() {
  const q = useQuery({
    queryKey: ["null-org-requests"],
    queryFn: () => adminService.nullOrgRequests(),
  });

  const items = useMemo<VerificationRequest[]>(() => {
    if (!q.data) return [];
    return Array.isArray(q.data) ? q.data : (q.data.items ?? []);
  }, [q.data]);

  const [active, setActive] = useState<VerificationRequest | null>(null);

  return (
    <div>
      <PageHeader
        title="Unmatched organizations"
        description="Requests where the issuing organization isn't yet in the network. Assign or onboard them here."
      />

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to review"
          description="Every submitted request is already matched to a verified organization."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <Card key={r.uuid} className="border-border/70 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/15 text-warning-foreground dark:text-warning">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <PriorityBadge priority={r.priority} />
                </div>
                <div className="mt-4">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Claimed organization
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {r.other_organization_name ?? "Unnamed"}
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Document</dt>
                    <dd className="font-medium text-foreground">{r.document_type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Requester</dt>
                    <dd className="text-foreground">{r.submitted_by?.full_name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Submitted</dt>
                    <dd className="text-foreground">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
                <Button
                  size="sm"
                  className="mt-5 w-full"
                  onClick={() => setActive(r)}
                >
                  Accept & assign organization
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignDialog request={active} onClose={() => setActive(null)} />
    </div>
  );
}

function AssignDialog({
  request,
  onClose,
}: {
  request: VerificationRequest | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const orgs = useQuery({
    queryKey: ["admin-orgs-lookup"],
    queryFn: () => adminService.organizations({ page: 1, limit: 100 }),
    enabled: !!request,
  });
  const [orgUuid, setOrgUuid] = useState<string>("");
  const [remarks, setRemarks] = useState("");

  const accept = useMutation({
    mutationFn: () =>
      adminService.acceptRequest(request!.uuid, {
        verification_remarks: remarks,
        issuing_organization_uuid: orgUuid || undefined,
      }),
    onSuccess: () => {
      toast.success("Request accepted and routed");
      qc.invalidateQueries({ queryKey: ["null-org-requests"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign organization</DialogTitle>
          <DialogDescription>
            The requester typed{" "}
            <span className="font-medium text-foreground">
              "{request?.other_organization_name}"
            </span>
            . Route this to an existing verified organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select value={orgUuid} onValueChange={setOrgUuid}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {(orgs.data?.items ?? []).map((o) => (
                  <SelectItem key={o.uuid} value={o.uuid}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Verification remarks</Label>
            <Textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Note for the requester and/or the receiving org…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={accept.isPending}>
            Cancel
          </Button>
          <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
            Accept & assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
