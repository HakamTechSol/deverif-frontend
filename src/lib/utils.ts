import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "/api/v1";
const ASSET_BASE = API_BASE.replace(/\/api\/v1\/?$/, "");

export function resolveAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) return path;
  return `${ASSET_BASE}/${path.replace(/^\//, "")}`;
}

export function formatDate(value?: string | Date | null, locale: string = "en-PK"): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateTime(value?: string | Date | null, locale: string = "en-PK"): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
