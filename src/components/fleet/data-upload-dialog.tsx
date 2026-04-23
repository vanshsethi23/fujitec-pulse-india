import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  REQUIRED_CSV_HEADERS,
  csvRowsToUnits,
  validateCsvHeaders,
  type CsvRow,
} from "@/lib/fleet";
import { useFleetData } from "@/components/fleet/fleet-data-context";

interface ParsedState {
  fileName: string;
  rows: CsvRow[];
  headers: string[];
  preview: CsvRow[];
  uniqueElevators: number;
}

interface DataUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "preview";

export function DataUploadDialog({ open, onOpenChange }: DataUploadDialogProps) {
  const { setUnits, reset, source, fileName: activeFile } = useFleetData();
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  // Drive step from parsed state, with a tiny delay so the slide animation runs.
  useEffect(() => {
    if (parsed) {
      const id = requestAnimationFrame(() => setStep("preview"));
      return () => cancelAnimationFrame(id);
    }
    setStep("upload");
  }, [parsed]);

  const reject = (msg: string) => {
    setError(msg);
    setParsed(null);
    setParsing(false);
  };

  const handleFile = useCallback((file: File) => {
    setError(null);
    setParsed(null);

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      reject("Only .csv files are accepted.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      reject("File exceeds 25 MB limit.");
      return;
    }

    setParsing(true);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).map((h) => h.trim());
        const validation = validateCsvHeaders(headers);
        if (!validation.ok) {
          reject(
            `Missing required column${validation.missing.length > 1 ? "s" : ""}: ${validation.missing.join(", ")}`,
          );
          return;
        }
        const rows = (result.data as CsvRow[]).filter(
          (r) => r && String(r.Elevator_ID ?? "").trim() !== "",
        );
        if (rows.length === 0) {
          reject("CSV contains no data rows.");
          return;
        }
        const uniqueElevators = new Set(rows.map((r) => String(r.Elevator_ID).trim())).size;
        setParsed({
          fileName: file.name,
          rows,
          headers,
          preview: rows.slice(0, 5),
          uniqueElevators,
        });
        setParsing(false);
      },
      error: (err) => reject(`Parse error: ${err.message}`),
    });
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onConfirm = () => {
    if (!parsed) return;
    const units = csvRowsToUnits(parsed.rows);
    if (units.length === 0) {
      reject("No valid elevators could be derived from the file.");
      return;
    }
    setUnits(units, parsed.fileName, parsed.rows);
    toast.success(`Successfully ingested data for ${units.length} elevators.`, {
      description: `${parsed.fileName} · ${parsed.rows.length.toLocaleString()} telemetry rows`,
    });
    setParsed(null);
    setError(null);
    onOpenChange(false);
  };

  const goBackToUpload = () => {
    setStep("upload");
    // Wait for slide-out before clearing parsed state
    window.setTimeout(() => {
      setParsed(null);
      setError(null);
    }, 320);
  };

  const closeAndClear = (next: boolean) => {
    if (!next) {
      setParsed(null);
      setError(null);
      setDragActive(false);
      setStep("upload");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={closeAndClear}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-[860px] overflow-hidden border-border bg-card p-0"
      >
        <div className="flex flex-col gap-4 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Upload className="h-4 w-4 text-brand" />
              Ingest Telemetry CSV
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              Upload a long-format telemetry export. Rows are aggregated per{" "}
              <span className="font-mono text-foreground">Elevator_ID</span> and the latest
              reading drives the dashboard.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em]">
            <span
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                step === "upload" ? "text-brand" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                  step === "upload"
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted-foreground",
                )}
              >
                1
              </span>
              Upload
            </span>
            <span className="h-px w-8 bg-border" />
            <span
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                step === "preview" ? "text-brand" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                  step === "preview"
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted-foreground",
                )}
              >
                2
              </span>
              Preview
            </span>
          </div>
        </div>

        {/* Sliding step viewport */}
        <div className="relative w-full overflow-hidden px-6">
          <div
            className="flex w-[200%] transition-transform duration-[350ms] ease-in-out"
            style={{ transform: step === "upload" ? "translateX(0%)" : "translateX(-50%)" }}
          >
            {/* Step 1 — Upload */}
            <div className="w-1/2 shrink-0 space-y-3 pr-3">
              {/* Active dataset chip */}
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-[11px]">
                <span className="truncate text-muted-foreground">
                  Active dataset:{" "}
                  <span className="font-mono text-foreground">
                    {source === "csv" ? activeFile : "Archetype mock (200 units)"}
                  </span>
                </span>
                {source === "csv" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      reset();
                      toast("Reverted to archetype dataset.");
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-10 text-center transition-colors",
                  dragActive
                    ? "border-brand bg-brand/5"
                    : "border-border bg-surface hover:border-brand/50 hover:bg-brand/5",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-brand">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="text-[13px] font-medium text-foreground">
                  {parsing ? "Parsing…" : "Drop CSV here or click to browse"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  .csv only · max 25 MB · {REQUIRED_CSV_HEADERS.length} required columns
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Required headers */}
              <div className="rounded-md border border-border bg-surface p-3">
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Required columns
                </div>
                <div className="flex flex-wrap gap-1">
                  {REQUIRED_CSV_HEADERS.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical/10 p-3 text-[12px] text-critical">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1">{error}</div>
                  <button onClick={() => setError(null)} aria-label="Dismiss">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2 — Preview */}
            <div className="w-1/2 shrink-0 space-y-3 pl-3">
              {parsed && (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-healthy/30 bg-healthy/10 px-3 py-2 text-[12px] text-healthy">
                    <div className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Schema OK · <span className="font-mono">{parsed.fileName}</span>
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[11px]">
                      {parsed.rows.length.toLocaleString()} rows · {parsed.uniqueElevators} elevators
                    </span>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      First 5 rows preview
                    </div>
                    <div className="max-h-[300px] w-full max-w-full overflow-auto rounded-md border border-border">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-surface">
                          <TableRow className="border-border hover:bg-transparent">
                            {REQUIRED_CSV_HEADERS.map((h) => (
                              <TableHead
                                key={h}
                                className="whitespace-nowrap bg-surface text-[10px] uppercase tracking-[0.1em]"
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsed.preview.map((row, i) => (
                            <TableRow key={i} className="border-border">
                              {REQUIRED_CSV_HEADERS.map((h) => (
                                <TableCell
                                  key={h}
                                  className="whitespace-nowrap py-1.5 font-mono text-[11px] text-foreground"
                                >
                                  {String(row[h] ?? "")}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-card/50 p-4 sm:gap-2">
          {step === "preview" && parsed ? (
            <>
              <Button
                variant="outline"
                onClick={goBackToUpload}
                className="border-border bg-surface text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Choose different file
              </Button>
              <Button
                onClick={onConfirm}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Confirm Ingestion
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => closeAndClear(false)}
              className="border-border bg-surface text-foreground"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
