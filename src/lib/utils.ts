import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { uiLocale } from "@/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "/api/v1";
const ASSET_BASE = API_BASE.replace(/\/api\/v1\/?$/, "");

export function resolveAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:"))
    return path;
  return `${ASSET_BASE}/${path.replace(/^\//, "")}`;
}

export function formatDate(value?: string | Date | null, locale: string = uiLocale()): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateTime(value?: string | Date | null, locale: string = uiLocale()): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatCNIC(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** Keep only digits from a raw input value (for phone/number fields). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Inclusive calendar-day count between two date values (YYYY-MM-DD or ISO). */
export function countDays(startDate: string, endDate: string): number {
  const s = startDate ? new Date(startDate.replace(" ", "T")) : new Date(NaN);
  const e = endDate ? new Date(endDate.replace(" ", "T")) : new Date(NaN);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const sKey = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const eKey = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  return Math.max(0, Math.round((eKey - sKey) / 86400000) + 1);
}

export function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Normalize a feature_access value (object or JSON string) into booleans. */
export function parseFeatureAccess(raw: unknown) {
  let obj: Record<string, unknown> = raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = {};
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) obj = {};
  const n = obj as Record<string, unknown>;
  const bool = (key: string, def: boolean) => (n[key] === undefined ? def : !!n[key]);
  return {
    attendance: bool("attendance", true),
    leave: bool("leave", true),
    payroll: bool("payroll", true),
    manage_employees: bool("manage_employees", false),
    generate_request: bool("generate_request", false),
    approve_request: bool("approve_request", false),
  };
}
