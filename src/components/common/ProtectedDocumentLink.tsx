import { useCallback, useState, type MouseEvent } from "react";
import { openStoredDocument } from "@/lib/documents";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Anchor that opens an uploaded document through the authenticated download
 * API instead of the (now removed) public /uploads static mount. Preserves the
 * markup/classes of a plain <a> so it works as a Button asChild child too.
 */
export function ProtectedDocumentLink({
  storedPath,
  onError,
  children,
  ...rest
}: Omit<AnchorProps, "href" | "onClick" | "target" | "rel"> & {
  storedPath?: string | null;
  onError?: () => void;
}) {
  const [opening, setOpening] = useState(false);

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (!storedPath || opening) return;
      setOpening(true);
      try {
        const opened = await openStoredDocument(storedPath);
        if (!opened) onError?.();
      } finally {
        setOpening(false);
      }
    },
    [storedPath, opening, onError],
  );

  return (
    <a
      {...rest}
      href={storedPath ?? "#"}
      target="_blank"
      rel="noreferrer"
      aria-disabled={opening}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
