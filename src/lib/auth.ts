import { useSyncExternalStore } from "react";

export type Role = "admin" | "user";
import type { FeatureAccess } from "@/services";

export type AuthUser = {
  uuid: string;
  full_name: string;
  email: string;
  role: Role;
  profile_image?: string | null;
  phone?: string | null;
  organization?: number | null;
  org_role?: "employee" | "org_admin" | "sub_admin";
  feature_access?: FeatureAccess | null;
  preferred_language?: "en" | "ur";
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let cachedToken: string | null = null;
let cachedRaw: string | null = null;
let cachedSnapshot: { token: string | null; user: AuthUser | null } = { token: null, user: null };

function read(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = window.localStorage.getItem("dvarif_token");
  const raw = window.localStorage.getItem("dvarif_user");
  if (token === cachedToken && raw === cachedRaw) return cachedSnapshot;
  let user: AuthUser | null = null;
  try {
    user = raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    user = null;
  }
  cachedToken = token;
  cachedRaw = raw;
  cachedSnapshot = { token, user };
  return cachedSnapshot;
}

export const authStore = {
  get: read,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  setSession(token: string, user: AuthUser) {
    window.localStorage.setItem("dvarif_token", token);
    window.localStorage.setItem("dvarif_user", JSON.stringify(user));
    emit();
  },
  updateUser(user: AuthUser) {
    window.localStorage.setItem("dvarif_user", JSON.stringify(user));
    emit();
  },
  clear() {
    window.localStorage.removeItem("dvarif_token");
    window.localStorage.removeItem("dvarif_user");
    emit();
  },
};

const serverSnap = { token: null as string | null, user: null as AuthUser | null };
export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.get, () => serverSnap);
}
