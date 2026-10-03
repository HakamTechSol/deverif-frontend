import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ModuleGate } from "@/components/hr/ModuleGate";
import { DataTable, DataTableToolbar, type DataTableColumn } from "@/components/hr/DataTable";
import { FormDialog } from "@/components/hr/FormDialog";
import { letterTemplatesService, HR_LETTER_TYPES } from "@/services";
import type { LetterTemplate, UUID } from "@/services";

/**
 * Reusable letter templates.
 *
 * Templates are ORG-WIDE: every issued letter was rendered from one, so deleting
 * one is org-admin-only server-side (enforced by the hrLettersOwner gate) even
 * though a sub-admin can still read and use them.
 */
export const Route = createFileRoute("/_app/org/letter-templates")({
  component: LetterTemplatesPage,
});

function LetterTemplatesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<LetterTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LetterTemplate | null>(null);

  const query = useQuery({
    queryKey: ["letter-templates"],
    queryFn: () => letterTemplatesService.list({ include_inactive: true }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["letter-templates"] });
  const remove = useMutation({ mutationFn: letterTemplatesService.remove, onSuccess: invalidate });

  const columns: DataTableColumn<LetterTemplate>[] = [
    {
      key: "name",
      header: t("letters.templateName"),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "letter_type",
      header: t("letters.type"),
      render: (r) => (
        <span className="text-sm">
          {HR_LETTER_TYPES.find((x) => x.key === r.letter_type)?.label ?? r.letter_type}
        </span>
      ),
    },
    {
      key: "merge_fields",
      header: t("letters.mergeTags"),
      render: (r) => {
        const tags = r.merge_fields ?? [];
        if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="font-mono text-[10px]">
                ${tag}
              </Badge>
            ))}
            {tags.length > 4 ? (
              <span className="text-xs text-muted-foreground">+{tags.length - 4}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "is_active",
      header: t("letters.status"),
      render: (r) => (
        <Badge variant={r.is_active ? "default" : "secondary"}>
          {r.is_active ? t("letters.active") : t("letters.inactive")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: t("common.actions"),
      className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={t("common.save")}
            onClick={() => setEditing(r)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t("common.delete")}
            onClick={() => setDeleting(r)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModuleGate module="hr_letters_management">
      <div className="space-y-4">
        <PageHeader
          title={t("letters.templatesTitle")}
          description={t("letters.templatesDescription")}
          actions={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t("letters.newTemplate")}
            </Button>
          }
        />

        <DataTableToolbar>
          <p className="text-xs text-muted-foreground">{t("letters.templatesHint")}</p>
        </DataTableToolbar>

        {query.isError ? (
          <EmptyState
            icon={FileText}
            title={t("letters.loadFailed")}
            description={(query.error as Error)?.message}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={query.data?.items ?? []}
            loading={query.isLoading}
            emptyIcon={FileText}
            emptyTitle={t("letters.noTemplates")}
            emptyDescription={t("letters.noTemplatesDescription")}
            showPagination={false}
          />
        )}

        <TemplateDialog
          open={creating || editing !== null}
          template={editing}
          onOpenChange={(v) => {
            if (!v) {
              setCreating(false);
              setEditing(null);
            }
          }}
          onDone={invalidate}
        />

        <ConfirmDialog
          open={deleting !== null}
          title={t("letters.deleteTemplate")}
          description={t("letters.deleteTemplateDescription")}
          confirmLabel={t("common.delete")}
          onConfirm={async () => {
            if (deleting) await remove.mutateAsync(deleting.uuid as UUID);
            setDeleting(null);
          }}
          onOpenChange={(v) => !v && setDeleting(null)}
        />
      </div>
    </ModuleGate>
  );
}

function TemplateDialog({
  open,
  template,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  template: LetterTemplate | null;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const tagsQuery = useQuery({
    queryKey: ["letter-merge-tags"],
    enabled: open,
    queryFn: () => letterTemplatesService.list(),
  });

  const save = useMutation({
    mutationFn: (values: { letterType: string; name: string; body: string }) =>
      template
        ? letterTemplatesService.update(template.uuid, values as never)
        : letterTemplatesService.create(values as never),
    onSuccess: () => {
      onDone();
      onOpenChange(false);
    },
  });

  const manualTags = tagsQuery.data?.manual_tags ?? [];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={template ? t("letters.editTemplate") : t("letters.newTemplate")}
      description={t("letters.templateFormDescription")}
      submitLabel={t("common.save")}
      cancelLabel={t("common.cancel")}
      defaultValues={{
        name: template?.name ?? "",
        letterType: template?.letter_type ?? "increment",
        body: template?.body ?? "Dear $employee_name,\n\n\n\nReference: $reference_no",
      }}
      onSubmit={(values) =>
        save.mutateAsync({
          name: String(values.name ?? ""),
          letterType: String(values.letterType ?? "custom"),
          body: String(values.body ?? ""),
        })
      }
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("letters.templateName")}</span>
        <input
          name="name"
          required
          defaultValue={template?.name ?? ""}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("letters.type")}</span>
        <select
          name="letterType"
          defaultValue={template?.letter_type ?? "increment"}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {HR_LETTER_TYPES.map((lt) => (
            <option key={lt.key} value={lt.key}>
              {lt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("letters.body")}</span>
        <Textarea
          name="body"
          required
          rows={12}
          defaultValue={template?.body ?? ""}
          className="font-mono text-xs"
        />
      </label>

      {manualTags.length ? (
        <div className="rounded-md bg-muted/60 p-3">
          <p className="mb-2 text-xs font-medium">{t("letters.insertTag")}</p>
          <div className="flex flex-wrap gap-1">
            {manualTags.map((tag) => (
              <Badge key={tag} variant="outline" className="cursor-default font-mono text-[10px]">
                ${tag}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("letters.tagHint")}</p>
        </div>
      ) : null}

      {save.isError ? (
        <p className="text-sm text-destructive">{(save.error as Error)?.message}</p>
      ) : null}
    </FormDialog>
  );
}
