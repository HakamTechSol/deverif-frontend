import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { paymentService, type OrgSubscription, type ModuleFlags } from "@/services";
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
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const orgSub = (q.data?.org_subscription as OrgSubscription) ?? null;
  const isActive = orgSub?.status === "active";
  const isExpired = orgSub?.status === "expired";
  const isNone = orgSub?.status === "none" || orgSub === null;
  const isLocked = q.isFetched && !isActive;
  const moduleFlags: ModuleFlags | null = orgSub?.module_flags ?? null;

  // True only when the subscription is ACTIVE but that module flag is
  // specifically off. A "none"/expired subscription is the subscription lock,
  // not a per-module one, and legacy plans with no flags are unrestricted —
  // both mirroring the backend.
  const isModuleFlagOff = (key: keyof ModuleFlags) =>
    isActive && moduleFlags != null && moduleFlags[key] !== true;

  const isModuleLocked = (key: keyof ModuleFlags) =>
    user?.role !== "admin" && (isLocked || isModuleFlagOff(key));

  return {
    orgSub,
    isActive,
    isExpired,
    isNone,
    isLocked,
    isModuleFlagOff,
    isModuleLocked,
    moduleFlags,
    isLoading: q.isLoading,
  };
}
