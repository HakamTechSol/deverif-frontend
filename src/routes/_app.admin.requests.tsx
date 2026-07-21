import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileCheck2, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { TableSkeleton } from "./_app.requests";
import { adminService, type UUID } from "@/services";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/requests")({
  head: () => ({ meta: [{ title: "Verification Requests — Dvarif Admin" }] }),
  component: AdminRequestsPage,
});

function AdminRequestsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [toDelete, setToDelete] = useState<UUID | null>(null);

  const list = useQuery({
    queryKey: ["admin-requests", page, search, status],
    queryFn: () =>
      adminService.requests({
        page,
        limit: 10,
        search,
        status: status === "all" ? undefined : status,
      }),
  });

  const del = useMutation({
    mutationFn: (uuid: UUID) => adminService.deleteRequest(uuid),
    onSuccess: () => {
      toast.success("Request removed");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="All verification requests"
        description="Every request across the network. Filter, search, and moderate as needed."
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
              placeholder="Search requests…"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={FileCheck2} title="No requests" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Issuing org</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
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
                        {r.requester_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.issuing_org_name ?? (
                          <span className="italic">
                            {r.other_organization_name ?? "—"}
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
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setToDelete(r.uuid)}
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

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this request?"
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
      />
    </div>
  );
}
