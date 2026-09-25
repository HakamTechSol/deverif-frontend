import { api } from "./api";

export type ServedDocType = "requests" | "employees";

/**
 * Map a stored document path to the authenticated download route params.
 *  - verification_requests.document_path = "/uploads/documents/<file>"   → "requests"
 *  - employee_documents.file_path       = "documents/<file>"             → "employees"
 * Returns null for any other shape (logos, profile images, malformed paths).
 */
export function documentRouteFromStoredPath(
  path?: string | null,
): { type: ServedDocType; filename: string } | null {
  if (!path) return null;
  const p = String(path).replace(/^\//, "");
  if (!p) return null;

  let type: ServedDocType | null = null;
  if (p.startsWith("uploads/documents/")) type = "requests";
  else if (p.startsWith("documents/")) type = "employees";
  if (!type) return null;

  const prefix = type === "requests" ? "uploads/documents/" : "documents/";
  const filename = p.slice(prefix.length);
  if (!filename || /(^|\/)\/|\.\./.test(filename) || filename.includes("\\")) return null;
  return { type, filename };
}

/** Fetch a stored document Blob using the authenticated axios instance. */
export async function fetchStoredDocument(path?: string | null): Promise<Blob | null> {
  const route = documentRouteFromStoredPath(path);
  if (!route) return null;
  try {
    const res = await api.get(`/documents/${route.type}/${encodeURIComponent(route.filename)}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  } catch {
    return null;
  }
}

/** Open a stored document in a new tab (blob URL). Returns false on failure. */
export async function openStoredDocument(path?: string | null): Promise<boolean> {
  const blob = await fetchStoredDocument(path);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
