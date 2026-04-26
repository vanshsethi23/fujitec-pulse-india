import { useEffect, useState } from "react";
import { Check, Copy, Download, FileText, Sparkles } from "lucide-react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ScoredUnit } from "@/lib/fleet";

interface Props {
  unit: ScoredUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalDialog({ unit, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !unit) return;
    let cancelled = false;
    setLoading(true);
    setProposal("");
    setError(null);
    setCopied(false);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-proposal",
          {
            body: {
              unit: {
                Unit_ID: unit.Unit_ID,
                Site: unit.Site,
                City: unit.City,
                Install_Year: unit.Install_Year,
                age: unit.age,
                Motor_Temp_C: unit.Motor_Temp_C,
                Vibration_RMS: unit.Vibration_RMS,
                Current_Draw_A: unit.Current_Draw_A,
                Leveling_Accuracy_mm: unit.Leveling_Accuracy_mm,
                Main_Rope_Condition: unit.Main_Rope_Condition,
                Door_Cycles_Hour: unit.Door_Cycles_Hour,
                score: unit.score,
              },
            },
          },
        );
        if (cancelled) return;
        if (fnError) {
          const msg =
            (fnError as { context?: { error?: string } })?.context?.error ??
            fnError.message ??
            "Failed to generate proposal";
          setError(msg);
          toast.error(msg);
        } else if (data?.proposal) {
          setProposal(data.proposal as string);
        } else if (data?.error) {
          setError(data.error as string);
          toast.error(data.error as string);
        } else {
          setError("Empty response from AI");
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, unit]);

  const handleCopy = async () => {
    if (!proposal) return;
    try {
      await navigator.clipboard.writeText(proposal);
      setCopied(true);
      toast.success("Proposal copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const handleDownload = () => {
    if (!proposal || !unit) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 56;
    const maxWidth = pageWidth - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Fujitec Modernization Proposal", margin, margin);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(
      `Unit ${unit.Unit_ID} · ${unit.Site}, ${unit.City} · Generated ${new Date().toLocaleDateString("en-IN")}`,
      margin,
      margin + 18,
    );

    doc.setDrawColor(220);
    doc.line(margin, margin + 28, pageWidth - margin, margin + 28);

    doc.setTextColor(20);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(proposal, maxWidth);
    let y = margin + 50;
    const lineHeight = 15;
    const pageHeight = doc.internal.pageSize.getHeight();
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    doc.save(`Fujitec-Proposal-${unit.Unit_ID}.pdf`);
    toast.success("PDF downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col border-border bg-card p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1">
              <DialogTitle className="text-[15px] font-semibold tracking-tight">
                AI Modernization Proposal
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                {unit
                  ? `${unit.Unit_ID} · ${unit.Site}, ${unit.City}`
                  : "Awaiting unit"}
              </DialogDescription>
            </div>
            {unit && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-[0.1em] border-border bg-surface text-muted-foreground"
              >
                Score {unit.score.toFixed(2)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading && <ProposalSkeleton />}

          {!loading && error && (
            <div className="rounded-md border border-critical/30 bg-critical/10 p-4 text-[13px] text-critical">
              {error}
            </div>
          )}

          {!loading && !error && proposal && (
            <div className="rounded-md border border-border bg-background">
              <pre className="whitespace-pre-wrap break-words p-4 font-sans text-[13px] leading-relaxed text-foreground">
                {proposal}
              </pre>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border bg-surface/60 px-6 py-3">
          <div className="text-[11px] text-muted-foreground">
            {loading ? "Synthesizing telemetry-driven narrative…" : "Generated by Lovable AI · Gemini"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || !proposal}
              onClick={handleCopy}
              className="h-8 border-border bg-card text-[12px]"
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-healthy" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              disabled={loading || !proposal}
              onClick={handleDownload}
              className="h-8 text-[12px]"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProposalSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <FileText className="h-3.5 w-3.5 animate-pulse text-primary" />
        <span>Drafting your proposal…</span>
      </div>
      <div className="space-y-2.5 rounded-md border border-border bg-background p-4">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-[95%] animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-[88%] animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-[92%] animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-[70%] animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-[85%] animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-[78%] animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-[60%] animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
