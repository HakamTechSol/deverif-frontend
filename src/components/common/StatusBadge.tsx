import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "pending" | "verified" | "unverified" | "under_review" | "rejected" | string;

const styles: Record<string, string> = {
  verified:
    "bg-success/12 text-success border-success/25 dark:bg-success/15",
  unverified:
    "bg-destructive/12 text-destructive border-destructive/25 dark:bg-destructive/15",
  rejected:
    "bg-destructive/12 text-destructive border-destructive/25 dark:bg-destructive/15",
  pending:
    "bg-muted text-muted-foreground border-border",
  under_review:
    "bg-warning/15 text-warning-foreground border-warning/30 dark:bg-warning/20 dark:text-warning",
};

const labels: Record<string, string> = {
  pending: "Pending",
  verified: "Verified",
  unverified: "Unverified",
  under_review: "Under review",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? styles.pending,
      )}
    >
      {labels[status] ?? status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: "normal" | "urgent" | string }) {
  const urgent = priority === "urgent";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        urgent
          ? "bg-destructive/10 text-destructive border-destructive/25"
          : "bg-muted text-muted-foreground border-border",
      )}
    >
      {priority}
    </Badge>
  );
}
