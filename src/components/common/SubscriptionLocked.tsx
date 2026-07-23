import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SubscriptionBanner() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <Lock className="h-4 w-4 text-destructive" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          Your organization subscription is not active
        </p>
        <p className="text-xs text-muted-foreground">
          Contact your admin to renew. Some features are restricted until the subscription is renewed.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link to="/payments">View Plan</Link>
      </Button>
    </div>
  );
}

export function FeatureLockedCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-dashed border-destructive/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Lock className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/payments">Renew Subscription</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
