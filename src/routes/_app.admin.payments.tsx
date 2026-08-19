import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Wallet, CreditCard, RefreshCw, Ban } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { adminService, type Organization } from "@/services";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Dvarif Admin" }] }),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  return (
    <div>
      <PageHeader
        title="Payments"
        description="Review platform payments, record manual receipts, and manage organization subscriptions."
      />

      <Tabs defaultValue="history">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="history">
            <Wallet className="mr-1.5 h-4 w-4" /> Payment History
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <CreditCard className="mr-1.5 h-4 w-4" /> Organization Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <PaymentHistoryTab />
        </TabsContent>

        <TabsContent value="subscriptions">
          <OrgSubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────── Payment History Tab ─────────── */
function PaymentHistoryTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openForm, setOpenForm] = useState(false);

  const list = useQuery({
    queryKey: ["admin-payments", page, search, method, dateFrom, dateTo],
    queryFn: () =>
      adminService.payments({
        page,
        limit: 10,
        search,
        method: method === "all" ? undefined : method,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  });

  const items = list.data?.items ?? [];

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search reference or user…"
          />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full lg:w-40"
            />
            <span className="text-xs text-muted-foreground max-lg:px-1">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full lg:w-40"
            />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
                <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full lg:w-auto" onClick={() => setOpenForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add manual payment
            </Button>
          </div>
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
                    <TableCell data-label="Reference" className="font-mono text-xs">{p.transaction_reference}</TableCell>
                    <TableCell data-label="User" className="text-muted-foreground">
                      {p.full_name ?? "—"}
                      <div className="text-xs">{p.email}</div>
                    </TableCell>
                    <TableCell data-label="Method">
                      <Badge variant="outline" className="rounded-full capitalize">
                        {p.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="Purpose" className="text-muted-foreground">{p.purpose}</TableCell>
                    <TableCell data-label="Date" className="text-xs text-muted-foreground">
                      {formatDate(p.paid_at ?? p.created_at)}
                    </TableCell>
                    <TableCell data-label="Amount" className="text-right font-medium">Rs. {p.amount.toLocaleString()}</TableCell>
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

      <PaymentFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        onDone={() => {
          setOpenForm(false);
          qc.invalidateQueries({ queryKey: ["admin-payments"] });
        }}
      />
    </Card>
  );
}

/* ─────────── Organization Subscriptions Tab ─────────── */
function OrgSubscriptionsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [confirmOrg, setConfirmOrg] = useState<{ org: Organization; plan: "monthly" | "yearly"; amount: string } | null>(null);
  const [cancelOrg, setCancelOrg] = useState<Organization | null>(null);

  const list = useQuery({
    queryKey: ["admin-orgs-subs", page, search],
    queryFn: () => adminService.organizations({ page, limit: 10, search }),
  });

  const setSub = useMutation({
    mutationFn: ({ uuid, plan, amount }: { uuid: string; plan: "monthly" | "yearly"; amount: number }) =>
      adminService.setOrganizationSubscription(uuid, plan, amount),
    onSuccess: (_, vars) => {
      const label = vars.plan === "monthly" ? "Monthly" : "Yearly";
      toast.success(`Subscription set to ${label}`);
      qc.invalidateQueries({ queryKey: ["admin-orgs-subs"] });
      qc.invalidateQueries({ queryKey: ["admin-orgs"] });
      qc.invalidateQueries({ queryKey: ["org-subscription"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to set subscription"),
  });

  const cancelSub = useMutation({
    mutationFn: (uuid: string) => adminService.cancelOrganizationSubscription(uuid),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      setCancelOrg(null);
      qc.invalidateQueries({ queryKey: ["admin-orgs-subs"] });
      qc.invalidateQueries({ queryKey: ["admin-orgs"] });
      qc.invalidateQueries({ queryKey: ["org-subscription"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to cancel subscription"),
  });

  const items = list.data?.items ?? [];

  const subscriptionBadge = (org: Organization) => {
    if (org.subscription_status === "active" && org.subscription_expiry) {
      const expiryDate = new Date(String(org.subscription_expiry).replace(" ", "T"));
      if (isNaN(expiryDate.getTime())) {
        return (
          <Badge className="rounded-full border-success/30 bg-success/10 text-success" variant="outline">
            Active
          </Badge>
        );
      }
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return (
        <Badge className="rounded-full border-success/30 bg-success/10 text-success" variant="outline">
          Active
          <span className="ml-1 text-xs font-normal">({daysLeft}d left)</span>
        </Badge>
      );
    }
    if (org.subscription_status === "expired") {
      return (
        <Badge className="rounded-full border-destructive/30 bg-destructive/10 text-destructive" variant="outline">
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="rounded-full text-muted-foreground">
        None
      </Badge>
    );
  };

  const isActive = (org: Organization) => org.subscription_status === "active";

  const handleSetSubscription = (org: Organization, plan: "monthly" | "yearly") => {
    setConfirmOrg({ org, plan, amount: "" });
  };

  const confirmSet = () => {
    if (!confirmOrg) return;
    const amt = Number(confirmOrg.amount) || 0;
    setSub.mutate({ uuid: confirmOrg.org.uuid, plan: confirmOrg.plan, amount: amt });
    setConfirmOrg(null);
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
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
            <EmptyState icon={CreditCard} title="No organizations" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((org) => (
                  <TableRow key={org.uuid}>
                    <TableCell data-label="Organization" className="font-medium text-foreground">{org.name}</TableCell>
                    <TableCell data-label="Status">{subscriptionBadge(org)}</TableCell>
                    <TableCell data-label="Plan" className="capitalize text-muted-foreground">
                      {org.subscription_plan ?? "—"}
                    </TableCell>
                    <TableCell data-label="Expiry Date" className="text-xs text-muted-foreground">
                      {org.subscription_expiry ? formatDate(org.subscription_expiry) : "—"}
                    </TableCell>
                    <TableCell data-label="Actions" className="text-right">
                      <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
                        <Button
                          size="sm"
                          variant={isActive(org) ? "default" : "outline"}
                          className="h-7 text-xs"
                          disabled={setSub.isPending || isActive(org)}
                          onClick={() => handleSetSubscription(org, "monthly")}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Monthly
                        </Button>
                        <Button
                          size="sm"
                          variant={isActive(org) ? "default" : "outline"}
                          className="h-7 text-xs"
                          disabled={setSub.isPending || isActive(org)}
                          onClick={() => handleSetSubscription(org, "yearly")}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Yearly
                        </Button>
                        {isActive(org) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={cancelSub.isPending}
                            onClick={() => setCancelOrg(org)}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                        )}
                      </div>
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

      {/* Set subscription dialog */}
      <Dialog open={!!confirmOrg} onOpenChange={(o) => !o && setConfirmOrg(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm subscription</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set <span className="font-medium text-foreground">{confirmOrg?.org.name}</span> to a{" "}
            <span className="font-medium text-foreground">
              {confirmOrg?.plan === "monthly" ? "Monthly" : "Yearly"}
            </span>{" "}
            subscription? This will <span className="font-medium text-foreground">restart from today</span>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="sub-amount">Amount received (Rs.) — optional</Label>
            <Input
              id="sub-amount"
              type="number"
              min="0"
              placeholder="Leave empty if no payment"
              value={confirmOrg?.amount ?? ""}
              onChange={(e) => setConfirmOrg((prev) => prev ? { ...prev, amount: e.target.value } : null)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOrg(null)}>
              Cancel
            </Button>
            <Button onClick={confirmSet} disabled={setSub.isPending}>
              {setSub.isPending ? "Setting…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel subscription dialog */}
      <Dialog open={!!cancelOrg} onOpenChange={(o) => !o && setCancelOrg(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will cancel the subscription for{" "}
            <span className="font-medium text-foreground">{cancelOrg?.name}</span>. Their access will end
            immediately and they will need a new subscription to create or verify requests.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOrg(null)}>
              Go back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelOrg) cancelSub.mutate(cancelOrg.uuid);
              }}
              disabled={cancelSub.isPending}
            >
              {cancelSub.isPending ? "Cancelling…" : "Cancel subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─────────── Add Manual Payment Dialog ─────────── */
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
                    {u.organization_name ?? u.full_name}
                    <span className="ml-1 text-muted-foreground">({u.full_name})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
