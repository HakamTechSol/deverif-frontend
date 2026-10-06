import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye, FileText, ImageIcon, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize } from "@/lib/utils";
import { saveBlob, useAttachmentUrl } from "@/lib/useAttachmentUrl";
import { assetsService, type AssetAttachment } from "@/services";

/**
 * One attachment, as a card rather than a line of text.
 *
 * A bare filename is close to useless for a purchase receipt: the whole point of
 * keeping one is to check a price or a warranty, and you cannot check anything
 * from a filename. So this offers the three things that make the file usable -
 * look at it, download it, remove it - and shows what kind of file it is without
 * opening anything.
 *
 * EVERY BYTE IS FETCHED THROUGH AXIOS. The endpoint is authenticated, so an <img>
 * or <a> pointed straight at it renders a 401 as the image. That is also why the
 * object URL is revoked on unmount; see useAttachmentUrl.
 */

/** True for the mime types a browser can show inline, as opposed to download. */
function isImage(mime: string | null): boolean {
  if (!mime) return false;
  return mime.startsWith("image/");
}

function isPdf(mime: string | null): boolean {
  return mime === "application/pdf";
}

export function AttachmentCard({
  attachment,
  onDeleted,
}: {
  attachment: AssetAttachment;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<null | "view" | "download" | "delete">(null);

  const image = isImage(attachment.mime_type);
  const pdf = isPdf(attachment.mime_type);

  // Load the bytes on hover OR once a preview is open. Never on mount: a drawer
  // of twenty receipts would otherwise fire twenty authenticated requests the
  // moment it opened.
  const {
    url,
    blob: loadedBlob,
    isLoading,
  } = useAttachmentUrl(hovered || previewOpen, () =>
    assetsService.downloadAttachment(attachment.uuid),
  );

  const handleDownload = async () => {
    setBusy("download");
    try {
      // Reuse the bytes already fetched for the preview when they exist. The
      // object URL is for DISPLAY only — re-fetching from a blob: URL is not
      // reliably supported, so depending on it would make Download silently fail
      // on exactly the cards the user has already opened.
      const blob = loadedBlob ?? (await assetsService.downloadAttachment(attachment.uuid));
      saveBlob(blob, attachment.file_name);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      await assetsService.removeAttachment(attachment.uuid);
      onDeleted();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg border bg-card p-2.5"
      // Hovering arms the preview fetch. Kept as a plain handler rather than a
      // CSS-only affordance so it also fires for keyboard focus.
      onMouseEnter={() => setHovered(true)}
      onFocus={() => setHovered(true)}
    >
      {/* Thumbnail for images, a type badge otherwise. The badge is shown
          immediately with no network call; the thumbnail replaces it once the
          bytes arrive. */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {image && url ? (
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            // The filename is already in an adjacent button, so this decorative
            // image does not need a name a screen reader would read twice.
          />
        ) : image && isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : image ? (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={!image && !pdf}
          className="block max-w-full truncate text-left text-sm font-medium underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline"
          title={image || pdf ? t("assets.attachmentView") : t("assets.attachmentNoPreview")}
        >
          {attachment.file_name}
        </button>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
          {attachment.mime_type ? ` · ${attachment.mime_type}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {image || pdf ? (
          <Button
            variant="ghost"
            size="icon"
            title={t("assets.attachmentView")}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          title={t("assets.attachmentDownload")}
          disabled={busy !== null}
          onClick={() => void handleDownload()}
        >
          {busy === "download" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={t("assets.attachmentDelete")}
          disabled={busy !== null}
          onClick={() => void handleDelete()}
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{attachment.file_name}</DialogTitle>
            <DialogDescription>{t("assets.attachmentPreviewHint")}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/30">
            {isLoading && !url ? (
              <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </p>
            ) : image && url ? (
              <img src={url} alt={attachment.file_name} className="mx-auto max-w-full" />
            ) : pdf && url ? (
              // A blob URL in an iframe renders the PDF in the browser's own
              // viewer with no plugin and no third-party script.
              <iframe src={url} title={attachment.file_name} className="h-[70vh] w-full" />
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {t("assets.attachmentNoPreview")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
