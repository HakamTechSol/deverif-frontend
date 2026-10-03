import { type ReactNode } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Dialog shell wired to react-hook-form.
 *
 * This is the first consumer of `components/ui/form.tsx`, which shipped with the
 * shadcn set but had zero imports — every HR page used raw useState plus manual
 * validation instead. Centralising it here means a new module gets submit
 * handling, dirty-state protection and a spinner for free.
 *
 * It is intentionally NOT a generic form builder. Fields are still written by
 * hand with <FormField>/<FormItem> inside `children`, so a page can interleave
 * arbitrary layout — which every real HR form needs and which a
 * declarative-config approach always ends up fighting.
 *
 * Two behaviours worth knowing:
 *
 *   - ESC and the backdrop close the dialog, but only when `onCancel` is
 *     supplied. A destructive form should decide that itself rather than have
 *     the shell discard its state silently.
 *   - The submit button's `loading` prop disables it AND sets aria-busy, so a
 *     double-submit is impossible while a request is in flight.
 */

export function FormDialog<TFieldValues extends FieldValues = FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  defaultValues,
  form: externalForm,
  size = "md",
  footerExtra,
  children,
  /** Disables the footer entirely for read-only or custom-action dialogs. */
  hideFooter = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: SubmitHandler<TFieldValues>;
  onCancel?: () => void;
  defaultValues?: DefaultValues<TFieldValues>;
  /** Pass an existing form when the page needs to watch fields or reset imperatively. */
  form?: UseFormReturn<TFieldValues>;
  size?: "sm" | "md" | "lg" | "xl";
  footerExtra?: ReactNode;
  children: ReactNode;
  hideFooter?: boolean;
}) {
  const internalForm = useForm<TFieldValues>({ defaultValues });
  const form = externalForm ?? internalForm;
  const submitting = form.formState.isSubmitting;

  const handleOpenChange = (next: boolean) => {
    // While a request is in flight, refuse to close: cancelling mid-save would
    // leave the user unsure whether their change was recorded.
    if (submitting && !next) return;
    if (!next && onCancel) onCancel();
    onOpenChange(next);
  };

  const handleSubmit = form.handleSubmit(onSubmit);

  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={widths[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {/* `id` links the form element to Radix's description/label wiring. */}
        <form id="form-dialog-body" onSubmit={handleSubmit} className="space-y-4">
          {children}
        </form>

        {hideFooter ? null : (
          <DialogFooter>
            {footerExtra}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" form="form-dialog-body" loading={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
