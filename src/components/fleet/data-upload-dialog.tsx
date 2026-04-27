import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  REQUIRED_CSV_HEADERS,
  csvRowsToUnitsAsync,
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

export function DataUploadDialog({ open, onOpenChange }: DataUploadDialogProps) {
  const { setUnits, reset, source, fileName: activeFile } = useFleetData();
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState<"aggregating" | "scoring">("aggregating");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const onConfirm = async () => {
    if (!parsed || ingesting) return;
    setIngesting(true);
    setProgress(0);
    setProgressPhase("aggregating");
    try {
      const units = await csvRowsToUnitsAsync(parsed.rows, (pct, phase) => {
        setProgress(pct);
        setProgressPhase(phase);
      });
      if (units.length === 0) {
        setIngesting(false);
        reject("No valid elevators could be derived from the file.");
        return;
      }
      void setUnits(units, parsed.fileName, parsed.rows).catch((e) => {
        toast.error("Cloud save is still pending.", {
          description: e instanceof Error ? e.message : "The dataset remains visible locally for this session.",
        });
      });
      toast.success(`Successfully ingested data for ${units.length} elevators.`, {
        description: `${parsed.fileName} · ${parsed.rows.length.toLocaleString()} telemetry rows · saving to cloud`,
      });
      setIngesting(false);
      setParsed(null);
      setError(null);
      onOpenChange(false);
    } catch (e) {
      setIngesting(false);
      reject(e instanceof Error ? e.message : "Ingestion failed");
    }
  };

  const goBackToUpload = () => {
    setParsed(null);
    setError(null);
  };

  const closeAndClear = (next: boolean) => {
    if (ingesting) return;
    if (!next) {
      setParsed(null);
      setError(null);
      setDragActive(false);
    }
    onOpenChange(next);
  };

  const step: "upload" | "preview" = parsed ? "preview" : "upload";

  return (
    <Dialog open={open} onOpenChange={closeAndClear}>
      <DialogContent className="relative w-[calc(100vw-2rem)] max-w-[860px] overflow-hidden border-border bg-card p-0">
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
                "flex items-center gap-1.5",
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
                "flex items-center gap-1.5",
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

        {/* Step content — sliding viewport */}
        <div className="relative w-full overflow-hidden px-6 pb-2">
          <div
            className="flex w-full transition-transform duration-300 ease-in-out"
            style={{ transform: step === "upload" ? "translateX(0%)" : "translateX(-100%)" }}
          >
            {/* Step 1 — Upload */}
            <div className="w-full shrink-0 space-y-3 pr-2">
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
            <div className="w-full shrink-0 space-y-3 pl-2">
              {parsed ? (
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

                <div className="w-full min-w-0">
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    First 5 rows preview
                  </div>
                  <div className="max-h-[300px] w-full max-w-full overflow-x-auto overflow-y-auto rounded-md border border-border">
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
              ) : (
                <div className="h-[200px]" />
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
                disabled={ingesting}
                className="border-border bg-surface text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Choose different file
              </Button>
              <Button
                onClick={onConfirm}
                disabled={ingesting}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {ingesting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {ingesting ? "Processing…" : "Confirm Ingestion"}
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

        {ingesting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-lg bg-card/95 backdrop-blur-sm">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
            </div>
            <div className="text-center">
              <div className="text-[14px] font-semibold text-foreground">
                Processing Data…
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {progressPhase === "aggregating"
                  ? "Aggregating telemetry rows per Elevator_ID"
                  : "Scoring units and resolving statuses"}
              </div>
            </div>
            <div className="w-[280px]">
              <Progress value={progress} className="h-1.5" />
              <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>{progressPhase}</span>
                <span className="font-mono">{progress}%</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
