import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { paymentService } from "@/services";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Dvarif" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const plan = useQuery({ queryKey: ["plan"], queryFn: () => paymentService.plan() });
  const history: any[] = plan.data?.payments ?? [];

  return (
    <div>
      <PageHeader
        title="Billing & payments"
        description="Manage your plan and review payment history."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="rounded-full">
                  <Sparkles className="mr-1 h-3 w-3" /> Current plan
                </Badge>
                <h2 className="mt-3 text-xl font-semibold text-foreground">
                  {plan.data?.name ?? "Business"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.data?.description ??
                    "Unlimited verification requests, priority queue, and premium support."}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-foreground">
                  ${plan.data?.price ?? 49}
                </div>
                <div className="text-xs text-muted-foreground">per month</div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button>Upgrade plan</Button>
              <Button variant="outline">Manage billing</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-foreground">Next invoice</h3>
            <p className="mt-1 text-xs text-muted-foreground">Auto-charged monthly</p>
            <div className="mt-4 text-3xl font-semibold text-foreground">
              ${plan.data?.next_amount ?? 49}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              on {plan.data?.next_date ?? "the 1st of every month"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Payment history</h2>
          </div>
          {history.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="Payments will appear here after your first billing cycle."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((p) => (
                  <TableRow key={p.uuid}>
                    <TableCell className="font-mono text-xs">{p.transaction_reference}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{p.payment_method}</TableCell>
                    <TableCell className="text-muted-foreground">{p.purpose}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">${p.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
