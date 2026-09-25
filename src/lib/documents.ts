import { api } from "./api";

export type ServedDocType = "requests" | "employees";

/**
 * MIME type per stored-file extension.
 *
 * This is what makes "View" actually view. A Blob built from an axios response
 * inherits whatever Content-Type the server sent, and for these uploads that is
 * typically application/octet-stream. Chrome refuses to render an
 * application/octet-stream blob — it just downloads it — so the View button
 * saved the file instead of showing it. Handing the blob its real type lets the
 * browser's built-in PDF/image viewer render it in the tab.
 */
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

function mimeForPath(path?: string | null): string {
  const ext = String(path || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

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

/**
 * Open a stored document in a new tab.
 *
 * Goes through axios because the API is Bearer-token authenticated — a plain
 * <a href> navigation cannot carry the Authorization header and would 401.
 *
 * The window is opened SYNCHRONOUSLY on the click, before any await. Once we
 * await the request the user-gesture context is gone, and both `window.open`
 * and a programmatic blob-URL navigation get treated as a popup/download
 * instead of a view — which is why a plain `a.click()` on a blob kept saving
 * the file. Holding the window open first and writing the viewer into it keeps
 * the tab alive and lets the browser's viewer render the file.
 *
 * Formats the browser cannot render (docx/xls/zip) are still offered as a
 * download rather than shown as broken empty space.
 */
export async function openStoredDocument(path?: string | null): Promise<boolean> {
  const route = documentRouteFromStoredPath(path);
  if (!route) return false;

  const win = openViewerWindow();
  const blob = await fetchStoredDocument(path);
  if (!blob) {
    win?.close();
    return false;
  }

  const mime = mimeForPath(path);
  if (!isViewable(mime)) {
    // Not renderable — fall back to saving the file instead of a blank tab.
    win?.close();
    return triggerBlob(blob, mime, basename(path));
  }

  if (!win) {
    // Popup blocked: fall back to a download so the user still gets the file.
    return triggerBlob(blob, mime, basename(path));
  }

  const url = URL.createObjectURL(new Blob([blob], { type: mime }));
  const title = escapeHtml(basename(path) || "Document");
  const body = mime.startsWith("image/")
    ? `<img src="${url}" alt="${title}" style="max-width:100%;max-height:100%;object-fit:contain">`
    : `<embed src="${url}" type="${mime}" style="width:100%;height:100%">`;

  win.document.open();
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
      `<style>html,body{margin:0;height:100%;background:#525659}` +
      `body{display:flex;align-items:center;justify-content:center}embed{border:0}</style>` +
      `</head><body>${body}</body></html>`
  );
  win.document.close();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

/** Open a blank tab up-front so the later async work is not popup-blocked. */
function openViewerWindow(): Window | null {
  const win = window.open("", "_blank");
  if (win) {
    win.document.title = "Loading…";
    win.document.body?.appendChild(win.document.createTextNode("Loading…"));
  }
  return win;
}

/** MIME types a browser can display natively without downloading. */
function isViewable(mime: string): boolean {
  return mime === "application/pdf" || mime.startsWith("image/") || mime.startsWith("text/");
}

function basename(path?: string | null): string {
  const p = String(path || "");
  return p.split(/[\\/]/).pop() ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Download a stored document under its ORIGINAL file name.
 *
 * Stored names are opaque (`doc_<timestamp>_<rand><ext>`) so a user-supplied name
 * can never influence the path on disk; without an explicit download name the
 * browser fell back to that internal name.
 */
export async function downloadStoredDocument(
  path?: string | null,
  fileName?: string | null,
): Promise<boolean> {
  const blob = await fetchStoredDocument(path);
  if (!blob) return false;
  return triggerBlob(blob, mimeForPath(path), fileName);
}

function triggerBlob(blob: Blob, mime: string, fileName?: string | null): boolean {
  const url = URL.createObjectURL(new Blob([blob], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = safeDownloadName(fileName) || "document";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

/**
 * Reduce an arbitrary stored file_name to something safe for the `download`
 * attribute: strip directory components and characters that would let a name
 * confuse the OS or break out of the downloads folder.
 */
function safeDownloadName(name?: string | null): string {
  if (!name) return "";
  const base = String(name).split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"*/:<>?\\|]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "";
  return cleaned.slice(0, 200);
}
