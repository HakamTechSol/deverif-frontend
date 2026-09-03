import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { DvarifLoader } from "@/components/common/DvarifLoader";

import logoMark from "@/assets/logo-mark.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { verifyService } from "@/services";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/verify/$qrToken")({
  head: () => ({
    meta: [
      { title: "Verify Document — Dvarif" },
      { name: "description", content: "Confirm a document was officially verified on Dvarif." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { qrToken } = Route.useParams();

  const result = useQuery({
    queryKey: ["public-verify", qrToken],
    queryFn: () => verifyService.verify(qrToken),
    retry: false,
  });

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <img src={logoMark} alt="Dvarif" className="h-8 w-8" />
            <span className="text-lg font-bold text-foreground">Dvarif</span>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            dvarif.com
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          {result.isLoading ? (
            <Card className="border-border/70 bg-background shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <DvarifLoader size="md" />
                <p className="text-sm text-muted-foreground">Verifying certificate…</p>
              </CardContent>
            </Card>
          ) : result.isError ? (
            <Card className="border-border/70 bg-background shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Certificate not found</h1>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  This verification link is invalid or expired. The certificate it points to could
                  not be confirmed. If you believe this is a mistake, contact the organization that
                  issued it.
                </p>
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/">
                    Go to dvarif.com <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 bg-background shadow-none">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-9 w-9 text-success" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">Document verified</h1>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    The document shown below was officially verified through Dvarif and its
                    authenticity has been confirmed by the issuing organization.
                  </p>
                </div>

                <dl className="mt-8 space-y-3">
                  <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Document type
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {result.data.document_type}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Issued by
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {result.data.organization_name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Verified on
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {formatDateTime(result.data.verification_date)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Reference
                    </dt>
                    <dd className="break-all text-sm font-medium text-foreground">
                      {result.data.request_reference}
                    </dd>
                  </div>
                </dl>

                <div className="mt-8 rounded-lg border border-success/30 bg-success/5 p-3 text-center">
                  <p className="text-xs font-medium text-success">Status: VERIFIED</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-background py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Dvarif. Secure document verification.
        </p>
      </footer>
    </div>
  );
}
