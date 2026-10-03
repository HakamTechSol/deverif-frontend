import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileSignature, Plus, Download, ShieldCheck, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ModuleGate } from "@/components/hr/ModuleGate";
import { DataTable, DataTableToolbar, type DataTableColumn } from "@/components/hr/DataTable";
import { FormDialog } from "@/components/hr/FormDialog";
import { hrLettersService, letterTemplatesService, orgService, HR_LETTER_TYPES } from "@/services";
import type { HrLetter, HrLetterListItem, HrLetterStatus, UUID } from "@/services";

/**
 * Issued and draft HR letters.
 *
 * Plan gating is ModuleGate (hr_letters_management), NOT RequireOrgFeature:
 * letters are not delegable to sub-admins via feature_access, so the only axis
 * here is the plan. See the ROUTE_ACCESS comment for why.
 */
export const Route = createFileRoute("/_app/org/hr-letters")({
  component: HrLettersPage,
});

const STATUS_VARIANT: Record<HrLetterStatus, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  issued: "default",
  revoked: "destructive",
};

function HrLettersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | HrLetterStatus>("");
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ["hr-letters", page, search, statusFilter],
    queryFn: () =>
      hrLettersService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr-letters"] });

  const revoke = useMutation({
    mutationFn: ({ uuid, reason }: { uuid: UUID; reason: string }) =>
      hrLettersService.revoke(uuid, reason),
    onSuccess: invalidate,
  });

  const columns: DataTableColumn<HrLetterListItem>[] = [
    {
      key: "reference_no",
      header: t("letters.referenceNo"),
      render: (r) => <span className="font-mono text-xs">{r.reference_no}</span>,
    },
    {
      key: "employee",
      header: t("letters.employee"),
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.employee_name}</p>
          {r.employee_designation ? (
            <p className="truncate text-xs text-muted-foreground">{r.employee_designation}</p>
          ) : null}
        </div>
      ),
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
      key: "status",
      header: t("common.status"),
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
          {r.verify_url ? (
            <a
              href={r.verify_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ShieldCheck className="h-3 w-3" />
              {t("letters.viewVerification")}
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: "issued_at",
      header: t("letters.issuedAt"),
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.issued_at ? new Date(r.issued_at).toLocaleDateString("en-PK") : "—"}
        </span>
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
            title={t("letters.downloadPdf")}
            onClick={async () => {
              const blob = await hrLettersService.downloadPdf(r.uuid);
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          {r.status === "issued" ? (
            <Button
              variant="ghost"
              size="icon"
              title={t("letters.revoke")}
              onClick={() => revoke.mutate({ uuid: r.uuid, reason: "" })}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ModuleGate module="hr_letters_management">
      <div className="space-y-4">
        <PageHeader
          title={t("letters.title")}
          description={t("letters.description")}
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("letters.newLetter")}
            </Button>
          }
        />

        <DataTableToolbar>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <div className="flex gap-1">
            {(["", "draft", "issued", "revoked"] as const).map((s) => (
              <Button
                key={s || "all"}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => {
                  setStatusFilter(s as HrLetterStatus | "");
                  setPage(1);
                }}
              >
                {s === "" ? t("letters.all") : s}
              </Button>
            ))}
          </div>
        </DataTableToolbar>

        {query.isError ? (
          <EmptyState
            icon={FileSignature}
            title={t("letters.loadFailed")}
            description={(query.error as Error)?.message}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={query.data?.items ?? []}
            total={query.data?.total ?? 0}
            page={page}
            totalPages={query.data?.totalPages ?? 1}
            onPageChange={setPage}
            loading={query.isLoading}
            emptyIcon={FileSignature}
            emptyTitle={t("letters.emptyTitle")}
            emptyDescription={t("letters.emptyDescription")}
            emptyAction={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("letters.newLetter")}
              </Button>
            }
          />
        )}

        <CreateLetterDialog open={createOpen} onOpenChange={setCreateOpen} onDone={invalidate} />
      </div>
    </ModuleGate>
  );
}

function CreateLetterDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();

  // Loaded on open rather than on mount: these lists only exist to fill the
  // dialog, and an org can have hundreds of employees.
  const options = useQuery({
    queryKey: ["hr-letter-form-options"],
    enabled: open,
    queryFn: async () => {
      const [employees, templates] = await Promise.all([
        orgService.employees({ limit: 200 }),
        letterTemplatesService.list(),
      ]);
      return {
        // employees() returns the standard { items, total, ... } envelope, not a
        // bare array.
        employees: employees.items.map((e) => ({ uuid: e.uuid, full_name: e.full_name })),
        templates: templates.items,
      };
    },
  });

  const create = useMutation({
    mutationFn: hrLettersService.create,
    onSuccess: () => {
      onDone();
      onOpenChange(false);
    },
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("letters.newLetter")}
      description={t("letters.newLetterDescription")}
      submitLabel={t("letters.createDraft")}
      cancelLabel={t("common.cancel")}
      onSubmit={(values) =>
        create.mutateAsync({
          employee_uuid: String(values.employee_uuid ?? ""),
          template_uuid: values.template_uuid ? String(values.template_uuid) : undefined,
          letter_type: (values.letter_type ?? "custom") as HrLetter["letter_type"],
        })
      }
    >
      {/* Plain inputs for now: FormDialog supplies the form shell, submission
          and dirty-state handling, and the field set is still growing. Migrate
          to FormField/FormItem once validation rules land. */}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("letters.employee")}</span>
        <select
          name="employee_uuid"
          required
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            {t("letters.selectEmployee")}
          </option>
          {(options.data?.employees ?? []).map((e) => (
            <option key={e.uuid} value={e.uuid}>
              {e.full_name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("letters.template")}</span>
        <select
          name="template_uuid"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">{t("letters.noTemplate")}</option>
          {(options.data?.templates ?? []).map((tpl) => (
            <option key={tpl.uuid} value={tpl.uuid}>
              {tpl.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("letters.type")}</span>
        <select
          name="letter_type"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue="increment"
        >
          {HR_LETTER_TYPES.map((lt) => (
            <option key={lt.key} value={lt.key}>
              {lt.label}
            </option>
          ))}
        </select>
      </label>

      {create.isError ? (
        <p className="text-sm text-destructive">{(create.error as Error)?.message}</p>
      ) : null}
    </FormDialog>
  );
}
