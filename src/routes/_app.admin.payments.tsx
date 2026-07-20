import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Wallet } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { adminService } from "@/services";

export const Route = createFileRoute("/_app/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Dvarif Admin" }] }),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [openForm, setOpenForm] = useState(false);

  const list = useQuery({
    queryKey: ["admin-payments", page, search, method],
    queryFn: () =>
      adminService.payments({
        page,
        limit: 10,
        search,
        method: method === "all" ? undefined : method,
      }),
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Review platform payments and record manual receipts."
        actions={
          <Button onClick={() => setOpenForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add manual payment
          </Button>
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
              placeholder="Search reference or user…"
            />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
                <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {list.isLoading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Wallet} title="No payments yet" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.uuid}>
                      <TableCell className="font-mono text-xs">{p.transaction_reference}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.user?.full_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full capitalize">
                          {p.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.purpose}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">${p.amount}</TableCell>
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

      <PaymentFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        onDone={() => {
          setOpenForm(false);
          qc.invalidateQueries({ queryKey: ["admin-payments"] });
        }}
      />
    </div>
  );
}

function PaymentFormDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const users = useQuery({
    queryKey: ["admin-users-lookup"],
    queryFn: () => adminService.users({ page: 1, limit: 100 }),
    enabled: open,
  });

  const [userUuid, setUserUuid] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"jazzcash" | "easypaisa" | "manual">("manual");
  const [ref, setRef] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!userUuid || !amount || !ref || !purpose)
      return toast.error("All fields are required");
    setSubmitting(true);
    try {
      await adminService.createPayment({
        user_uuid: userUuid,
        amount: Number(amount),
        payment_method: method,
        transaction_reference: ref,
        purpose,
      });
      toast.success("Payment recorded");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add manual payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={userUuid} onValueChange={setUserUuid}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {(users.data?.items ?? []).map((u) => (
                  <SelectItem key={u.uuid} value={u.uuid}>
                    {u.full_name} · {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                  <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Transaction reference</Label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Monthly subscription"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
