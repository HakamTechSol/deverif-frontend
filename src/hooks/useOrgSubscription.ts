import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { paymentService, type OrgSubscription } from "@/services";
import { useAuth } from "@/lib/auth";

export function useOrgSubscription() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const q = useQuery({
    queryKey: ["org-subscription"],
    queryFn: () => paymentService.plan(),
    enabled: mounted && !!user && user.role !== "admin",
    retry: false,
    staleTime: 60_000,
  });

  const orgSub = (q.data?.org_subscription as OrgSubscription) ?? null;
  const isActive = orgSub?.status === "active";
  const isExpired = orgSub?.status === "expired";
  const isNone = orgSub?.status === "none" || orgSub === null;
  const isLocked = !isActive; // locked if expired OR no subscription

  return { orgSub, isActive, isExpired, isNone, isLocked, isLoading: q.isLoading };
}
