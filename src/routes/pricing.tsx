import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { marketingService } from "@/services";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Dvarif" },
      {
        name: "description",
        content:
          "Choose a Dvarif plan for your team. Every organization gets 1 free verification request per day.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const plans = useQuery({
    queryKey: ["marketing-plans"],
    queryFn: () => marketingService.listPlans(),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Dvarif
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link to="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-14 text-center">
        <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-xs text-muted-foreground">
          Simple, per-day pricing
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Pricing that grows with your team
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every organization gets <span className="font-medium text-foreground">1 free verification
          request per day</span>, on every plan. Upgrade for higher daily limits.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.isLoading ? (
            <p className="col-span-full text-center text-sm text-muted-foreground">Loading plans…</p>
          ) : plans.data && plans.data.length > 0 ? (
            plans.data.map((plan) => (
              <Card
                key={plan.uuid}
                className="flex flex-col border-border/70 shadow-none transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      Rs. {plan.monthly_price?.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /{plan.billing_period}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plan.daily_request_quota} paid verification requests per day
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-5">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      1 free request per day (always included)
                    </li>
                    {(plan.features ?? []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                    {(plan.features ?? []).length === 0 && (
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Standard verification features
                      </li>
                    )}
                  </ul>
                  <Button asChild className="w-full">
                    <Link to="/login">Get started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              No plans available yet.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Dvarif — Document Verification Platform
        </div>
      </footer>
    </div>
  );
}
