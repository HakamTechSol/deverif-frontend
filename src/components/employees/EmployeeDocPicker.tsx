import { useState } from "react";
import { FileUp, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFileSize } from "@/lib/utils";

export type StagedDoc = { name: string; file: File };

export const MAX_DOC_SIZE = 10 * 1024 * 1024;

export const ALLOWED_DOC_EXT = [
  ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
  ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".zip",
];

export function validateDocFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_DOC_EXT.includes(ext)) {
    return `Unsupported file type "${ext}". Allowed: ${ALLOWED_DOC_EXT.join(", ")}`;
  }
  if (file.size > MAX_DOC_SIZE) {
    return `"${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is 10MB.`;
  }
  return null;
}

export function EmployeeDocPicker({
  docs,
  onChange,
  onUpload,
  uploading,
  note,
  className,
}: {
  docs: StagedDoc[];
  onChange: (docs: StagedDoc[]) => void;
  onUpload?: () => void;
  uploading?: boolean;
  note?: string;
  className?: string;
}) {
  const [docName, setDocName] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const addDoc = () => {
    if (!docFile) {
      setError("Please choose a file first.");
      return;
    }
    const problem = validateDocFile(docFile);
    if (problem) {
      setError(problem);
      return;
    }
    onChange([...docs, { name: docName.trim(), file: docFile }]);
    setDocName("");
    setDocFile(null);
    setError("");
  };

  return (
    <div className={`space-y-2 ${className || ""}`}>
      <div className="grid gap-2">
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Document Name</Label>
            <Input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. CNIC, Contract"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">File (up to 10MB)</Label>
            <Input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setDocFile(picked);
                setError("");
                e.target.value = "";
              }}
              className="text-sm"
            />
            {docFile && (
              <div className="mt-1 text-xs text-muted-foreground">
                Selected: {docFile.name}
              </div>
            )}
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addDoc}>
          <FileUp className="mr-1.5 h-3.5 w-3.5" /> Add Doc
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map((d, idx) => (
            <div key={`${idx}-${d.file.name}`} className="flex min-w-0 max-w-full items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
              <span className="flex min-w-0 max-w-[70%] items-center gap-2">
                <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {d.name && <span className="font-medium">{d.name} — </span>}
                  <span className="text-muted-foreground">{d.file.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(d.file.size)}</span>
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(docs.filter((_, i) => i !== idx))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {note && <p className="text-xs text-muted-foreground break-words">{note}</p>}
          {onUpload && (
            <Button type="button" size="sm" variant="secondary" onClick={onUpload} loading={uploading}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload {docs.length} doc(s)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}