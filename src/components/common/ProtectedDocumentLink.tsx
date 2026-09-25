import { useCallback, useState, type MouseEvent } from "react";
import { openStoredDocument, downloadStoredDocument } from "@/lib/documents";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Anchor that opens an uploaded document through the authenticated download
 * API instead of the (now removed) public /uploads static mount. Preserves the
 * markup/classes of a plain <a> so it works as a Button asChild child too.
 *
 * Both modes go through axios: the API is Bearer-token authenticated, so a plain
 * <a href> navigation would be unauthenticated.
 *   mode="view"     renders the document in a new tab (PDF/image)
 *   mode="download" saves it under fileName — the name the user uploaded it as
 */
export function ProtectedDocumentLink({
  storedPath,
  fileName,
  mode = "view",
  onError,
  children,
  ...rest
}: Omit<AnchorProps, "href" | "onClick" | "target" | "rel" | "download"> & {
  storedPath?: string | null;
  fileName?: string | null;
  mode?: "view" | "download";
  onError?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (!storedPath || busy) return;
      setBusy(true);
      try {
        const ok =
          mode === "download"
            ? await downloadStoredDocument(storedPath, fileName)
            : await openStoredDocument(storedPath);
        if (!ok) onError?.();
      } finally {
        setBusy(false);
      }
    },
    [storedPath, fileName, mode, busy, onError],
  );

  return (
    <a
      {...rest}
      href={storedPath ?? "#"}
      target={mode === "view" ? "_blank" : undefined}
      rel={mode === "view" ? "noreferrer" : undefined}
      aria-disabled={busy}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
