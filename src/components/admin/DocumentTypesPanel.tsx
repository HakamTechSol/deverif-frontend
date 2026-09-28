import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileStack,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { adminService, type DocumentType } from "@/services";
import { apiErrorMessage } from "@/lib/utils";

/**
 * Document-type catalogue management — system admin only.
 *
 * The catalogue used to be a hard-coded array in the frontend with a mirrored
 * alias table in the Python OCR service, so adding a type meant editing code in
 * two repositories and redeploying both. It is now a database table, and the
 * backend pushes it to the OCR service after every change.
 *
 * The `schema` column is the part worth understanding: a type is not just a
 * label. The schema decides which fields get extracted from the document, so a
 * type added with the default `generic` will only ever surface a name and a
 * CNIC. Picking the schema that matches the document is what makes auto-matching
 * work well.
 */

/** Human labels for the canonical schemas, so the dropdown is not a wall of snake_case. */
const SCHEMA_LABELS: Record<string, string> = {
  generic: "Generic — name + CNIC (safe default)",
  cnic: "CNIC / National ID — name, CNIC, date of birth",
  passport: "Passport — name, CNIC, passport no., DOB",
  offer_letter: "Offer letter — name, CNIC, designation, joining date",
  appointment_letter: "Appointment letter — name, CNIC, designation, joining date",
  employment_contract: "Employment contract — name, CNIC, designation, joining date",
  experience_letter: "Experience letter — name, CNIC, designation, duration",
  reference_letter: "Reference letter — name, CNIC, recommendation date",
  resume: "CV / Resume — name, CNIC, designation",
  application_form: "Application form — name, CNIC, date of birth",
  education_certificate: "Education certificate — name, CNIC, degree, session",
  transcript: "Transcript / mark sheet — name, CNIC, degree, session",
  relieving_letter: "Relieving letter — name, CNIC, designation, last working day",
  resignation_letter: "Resignation letter — name, CNIC, designation, last working day",
  promotion_letter: "Promotion letter — name, CNIC, designation, effective date",
  increment_letter: "Increment letter — name, CNIC, designation, increment",
  transfer_letter: "Transfer letter — name, CNIC, effective date",
  bank_details: "Bank / salary details — name, CNIC, account number",
  tax_document: "Tax document — name, CNIC, tax year",
  background_check: "Background check — name, CNIC",
  medical_certificate: "Medical certificate — name, CNIC",
  character_certificate: "Character certificate — name, CNIC",
  emergency_form: "Emergency contact form — name, CNIC",
  leave_record: "Leave record — name, CNIC",
  attendance_record: "Attendance record — name, CNIC",
  performance_review: "Performance review — name, CNIC",
  training_record: "Training record — name, CNIC",
  disciplinary: "Disciplinary record — name, CNIC",
  exit_form: "Exit interview form — name, CNIC",
  clearance_form: "Clearance form — name, CNIC",
  settlement: "Final settlement — name, CNIC",
  photo: "Photograph — never auto-matched (no identity content)",
  employee_id: "Employee ID card — never auto-matched",
  policy_ack: "Policy acknowledgment — never auto-matched",
  legal_agreement: "Agreement / NDA — never auto-matched",
  onboarding: "Onboarding checklist — never auto-matched",
  asset_handover: "Asset handover form — never auto-matched",
  job_description: "Job description — never auto-matched",
  closing_checklist: "Closing checklist — never auto-matched",
};

/** Schemas the OCR service refuses to auto-approve on, from GET /schemas. */
const INELIGIBLE_SCHEMAS = new Set([
  "photo",
  "employee_id",
  "policy_ack",
  "legal_agreement",
  "onboarding",
  "asset_handover",
  "job_description",
  "closing_checklist",
]);

function schemaLabel(key: string) {
  return SCHEMA_LABELS[key] ?? key;
}

export function DocumentTypesPanel() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DocumentType | null>(null);

  const [name, setName] = useState("");
  const [schemaKey, setSchemaKey] = useState<string>("generic");
  const [description, setDescription] = useState("");

  const list = useQuery({
    queryKey: ["admin-document-types"],
    queryFn: () => adminService.documentTypes(),
  });

  const sync = useQuery({
    queryKey: ["admin-document-types-sync"],
    queryFn: () => adminService.documentTypeSyncStatus(),
    // The service can restart independently; a stale "in step" badge is worse
    // than a slightly older answer, so this is polled rather than fetched once.
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-document-types"] });
    qc.invalidateQueries({ queryKey: ["admin-document-types-sync"] });
    // Org-facing dropdowns read the same catalogue.
    qc.invalidateQueries({ queryKey: ["document-types"] });
  };

  const create = useMutation({
    mutationFn: () =>
      adminService.createDocumentType({
        name: name.trim(),
        schema_key: schemaKey,
        description: description.trim() || undefined,
      }),
    onSuccess: (t) => {
      toast.success(`"${t.name}" added`);
      setAddOpen(false);
      setName("");
      setSchemaKey("generic");
      setDescription("");
      invalidate();
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, "Could not add the document type")),
  });

  const toggleActive = useMutation({
    mutationFn: (t: DocumentType) =>
      adminService.updateDocumentType(t.id, { is_active: !t.is_active }),
    onSuccess: (t) => {
      toast.success(t.is_active ? `"${t.name}" is now selectable` : `"${t.name}" hidden`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, "Could not update the document type")),
  });

  const remove = useMutation({
    mutationFn: (t: DocumentType) => adminService.deleteDocumentType(t.id),
    onSuccess: (_d, t) => {
      toast.success(`"${t.name}" deleted`);
      setToDelete(null);
      invalidate();
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, "Could not delete the document type")),
  });

  const items = list.data ?? [];
  const activeCount = items.filter((t) => t.is_active).length;
  const ineligibleCount = items.filter((t) => INELIGIBLE_SCHEMAS.has(t.schema_key)).length;
  const syncOk = sync.data?.reachable === true;

  return (
    <div className="space-y-4">
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileStack className="h-4 w-4" />
                Document types
              </CardTitle>
              <CardDescription className="mt-1">
                {activeCount} of {items.length} active. These are the options every document upload
                and verification request offers.
              </CardDescription>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add document type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add document type</DialogTitle>
                  <DialogDescription>
                    Pick the schema that matches the document. It decides which fields get read out
                    of it when the document is compared against an employee's reference copy.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dt-name">Name</Label>
                    <Input
                      id="dt-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Vaccination Certificate"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dt-schema">Schema</Label>
                    <Select value={schemaKey} onValueChange={setSchemaKey}>
                      <SelectTrigger id="dt-schema">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Object.keys(SCHEMA_LABELS).map((key) => (
                          <SelectItem key={key} value={key}>
                            {schemaLabel(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Unsure? <span className="font-medium">Generic</span> is always safe — it reads
                      the name and CNIC and nothing else. You can change this later.
                    </p>
                  </div>

                  {INELIGIBLE_SCHEMAS.has(schemaKey) && (
                    <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        This document type carries no identifying content, so it will never be
                        auto-approved — every copy goes to a human. That is intentional.
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="dt-desc">Description (optional)</Label>
                    <Input
                      id="dt-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Required for field staff"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={create.isPending || !name.trim()}
                    loading={create.isPending}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-0">
          {/* Is the OCR service actually aware of these types? A type that only
              exists in the database still works (the service falls back to its
              own list), but it would not extract the schema chosen here — so
              this is worth showing rather than assuming. */}
          <div
            className={`mx-4 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
              sync.isLoading
                ? "border-border text-muted-foreground"
                : syncOk
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}
          >
            {sync.isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking the document service…
              </>
            ) : syncOk ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Document service is up to date
                {typeof sync.data?.catalogue_count === "number" && (
                  <span className="opacity-80">({sync.data.catalogue_count} types known)</span>
                )}
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                Document service unreachable — new types will still work, but they fall back to
                reading only the name and CNIC until it is back.
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => sync.refetch()}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </>
            )}
          </div>

          {ineligibleCount > 0 && (
            <p className="px-4 text-xs text-muted-foreground">
              {ineligibleCount} of these carry no identifying content and are never auto-approved.
            </p>
          )}

          {list.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading document types…
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No document types yet. Add the first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell data-label="#" className="text-muted-foreground">
                      {t.sort_order || i + 1}
                    </TableCell>
                    <TableCell data-label="Name">
                      <div className="font-medium text-foreground">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      )}
                    </TableCell>
                    <TableCell data-label="Schema">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {t.schema_key}
                        </code>
                        {INELIGIBLE_SCHEMAS.has(t.schema_key) && (
                          <Badge variant="secondary" className="text-[10px]">
                            never auto-matched
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-label="Status" className="text-center">
                      {t.is_active ? (
                        <Badge variant="outline" className="text-emerald-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Hidden
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell data-label="Actions" className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={toggleActive.isPending}
                          onClick={() => toggleActive.mutate(t)}
                        >
                          {t.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setToDelete(t)}
                          aria-label={`Delete ${t.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete document type?"
        description={
          toDelete
            ? `"${toDelete.name}" will no longer be offered. Verification requests that already use it keep their stored value, so old records still read correctly.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete);
        }}
      />
    </div>
  );
}
