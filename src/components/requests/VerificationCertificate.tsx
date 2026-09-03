import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { BadgeCheck, Download, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestsService, type VerificationRequest } from "@/services";

const VERIFY_URL_BASE = "https://portal.dverif.com/verify";

function buildVerifyUrl(qrToken: string) {
  return `${VERIFY_URL_BASE}/${qrToken}`;
}

export function VerificationCertificate({ request }: { request: VerificationRequest }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const qrToken = request.qr_token;
  const isVerified = request.status === "verified";

  useEffect(() => {
    let cancelled = false;
    if (isVerified && qrToken) {
      QRCode.toDataURL(buildVerifyUrl(qrToken), {
        width: 220,
        margin: 1,
        color: { dark: "#0f172a" },
      })
        .then((url) => {
          if (!cancelled) setQrDataUrl(url);
        })
        .catch(() => {
          if (!cancelled) setQrDataUrl(null);
        });
    } else {
      setQrDataUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [isVerified, qrToken]);

  if (!isVerified || !qrToken) return null;

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await requestsService.downloadCertificate(request.uuid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dvarif-certificate-${request.uuid.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Certificate download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border border-success/30 bg-success/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
        <BadgeCheck className="h-4 w-4" /> Verification certificate
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-md border border-border bg-white p-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Verification QR code" className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-muted-foreground">
              <QrCode className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Scan this QR code or open the link below to confirm the document was officially verified
            on dvarif.com. The code is tamper-evident and cannot be forged for a fake record.
          </p>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <div className="text-[10px] font-medium uppercase text-muted-foreground">
              Verify link
            </div>
            <div className="break-all text-xs font-medium text-foreground">
              {buildVerifyUrl(qrToken)}
            </div>
          </div>
          <Button onClick={download} disabled={downloading} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Preparing…" : "Download Certificate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
