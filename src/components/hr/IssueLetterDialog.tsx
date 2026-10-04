import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { letterTemplatesService, hrLettersService, type HrLetterListItem } from "@/services";

/**
 * Collects the merge-tag values a draft is still missing, then issues it.
 *
 * Why this dialog exists: the backend refuses to issue while any merge tag is
 * unresolved, and it reports exactly which ones. A menu item that POSTed
 * /issue directly therefore produced a hard 400 for every draft whose template
 * uses a manual tag (e.g. $new_salary on an increment letter) — the user was
 * asked to confirm issuing a letter that could not be issued. This dialog closes
 * that loop: preview -> fill -> issue.
 *
 * Issuance is one-way, so the preview is shown before anything is committed.
 */
export function IssueLetterDialog({
  letter,
  open,
  onOpenChange,
  onIssued,
}: {
  letter: HrLetterListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const templateUuid = letter?.template_uuid ?? null;
  const hasTemplate = Boolean(templateUuid);

  /**
   * Preview the rendered letter for the values entered SO FAR. This is what
   * reveals which tags remain, so the submit button can be gated on real server
   * state rather than a client-side guess at which tags exist.
   */
  const {
    data: preview,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["hr-letter-preview", templateUuid, letter?.employee_uuid, values],
    enabled: open && hasTemplate,
    queryFn: () =>
      letterTemplatesService.preview(templateUuid as string, {
        employee_uuid: letter!.employee_uuid,
        values,
      }),
  });

  // Re-seed from the draft's stored payload each time it opens, so a
  // half-filled draft is not silently wiped. Keyed on uuid (not payload) on
  // purpose: editing a field re-renders and must NOT reset what was typed.
  useEffect(() => {
    if (open) setValues({ ...(letter?.payload ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, letter?.uuid]);

  const issue = useMutation({
    mutationFn: () => hrLettersService.issue(letter!.uuid, values),
    onSuccess: () => {
      toast.success(t("letters.issuedToast"));
      onOpenChange(false);
      onIssued();
      void qc.invalidateQueries({ queryKey: ["hr-letters"] });
    },
    onError: (e: Error) => toast.error(t("letters.issueFailedToast"), { description: e.message }),
  });

  const missing = useMemo(() => preview?.missing_manual ?? [], [preview]);

  /** Tags referenced but with no source at all — a template bug, not user input. */
  const unknown = useMemo(() => preview?.unknown ?? [], [preview]);

  const unresolved = useMemo(() => preview?.unresolved ?? [], [preview]);

  // An unknown tag can never be resolved by typing, so it must not be ignored.
  const blocked = unresolved.length > 0 || unknown.length > 0 || isFetching;

  /**
   * Turn `$new_salary` into "New salary". Falls back to the raw tag so the
   * field is still identifiable if the name does not humanise cleanly.
   */
  const humanise = (tag: string) => {
    const words = tag.replace(/^\$/, "").replace(/_/g, " ").trim();
    if (!words) return tag;
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  if (!letter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("letters.issueLetter")}</DialogTitle>
          <DialogDescription>{t("letters.issueDescription")}</DialogDescription>
        </DialogHeader>

        {!hasTemplate ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t("letters.issueNoTemplate")}</AlertDescription>
          </Alert>
        ) : (
          <>
            {unknown.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t("letters.issueUnknownTags", {
                    tags: unknown.map((x) => `$${x}`).join(", "),
                  })}
                </AlertDescription>
              </Alert>
            )}

            {missing.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("letters.missingTagsHint")}</p>
                {missing.map((tag) => (
                  <div key={tag} className="space-y-1.5">
                    <Label htmlFor={`tag-${tag}`}>{humanise(tag)}</Label>
                    <Input
                      id={`tag-${tag}`}
                      value={values[tag] ?? ""}
                      placeholder={t("letters.tagPlaceholder")}
                      onChange={(e) => setValues((prev) => ({ ...prev, [tag]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("letters.preview")}</Label>
              <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-3">
                {error ? (
                  <p className="text-sm text-destructive">{t("letters.previewFailed")}</p>
                ) : isFetching && !preview ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm">{preview?.text ?? ""}</pre>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={issue.isPending}>
            {t("hr.formDialog.cancel")}
          </Button>
          <Button
            onClick={() => issue.mutate()}
            disabled={blocked || !hasTemplate || issue.isPending}
          >
            {issue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("letters.issueLetter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
