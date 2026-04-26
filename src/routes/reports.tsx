import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  Download,
  FileBarChart,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { HealthDonut } from "@/components/fleet/health-donut";
import { ScoreHistogram } from "@/components/fleet/score-histogram";
import { useFleetData } from "@/components/fleet/fleet-data-context";
import {
  formatInrCompact,
  isModernizationLead,
  leadReasons,
  summarize,
  THRESHOLDS,
  type ScoredUnit,
} from "@/lib/fleet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Fujitec Pulse" },
      {
        name: "description",
        content:
          "Executive-level fleet summary, modernization pipeline and downloadable PDF / CSV exports.",
      },
      { property: "og:title", content: "Reports — Fujitec Pulse" },
      {
        property: "og:description",
        content:
          "One-click executive PDF and ranked modernization pipeline CSV exports.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <AppShell crumb="Reports">
      <ReportsBody />
    </AppShell>
  );
}

function ageBracket(age: number): "0-5" | "6-15" | "16-25" | "25+" {
  if (age <= 5) return "0-5";
  if (age <= 15) return "6-15";
  if (age <= 25) return "16-25";
  return "25+";
}

function ReportsBody() {
  const { units, source, fileName } = useFleetData();
  const summary = useMemo(() => summarize(units), [units]);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const leads = useMemo(() => units.filter(isModernizationLead), [units]);
  const rankedLeads = useMemo(
    () => [...leads].sort((a, b) => b.score - a.score),
    [leads],
  );
  const top10 = rankedLeads.slice(0, 10);

  const safetyHazards = useMemo(
    () =>
      units.filter(
        (u) => u.Main_Rope_Condition < THRESHOLDS.rope.warningBelow,
      ),
    [units],
  );

  const readinessData = useMemo(() => {
    const buckets: Record<"0-5" | "6-15" | "16-25" | "25+", number> = {
      "0-5": 0,
      "6-15": 0,
      "16-25": 0,
      "25+": 0,
    };
    for (const u of units) buckets[ageBracket(u.age)]++;
    return [
      { bracket: "0-5 yrs", count: buckets["0-5"], key: "0-5" as const },
      { bracket: "6-15 yrs", count: buckets["6-15"], key: "6-15" as const },
      { bracket: "16-25 yrs", count: buckets["16-25"], key: "16-25" as const },
      { bracket: "25+ yrs", count: buckets["25+"], key: "25+" as const },
    ];
  }, [units]);

  const revenueInr = leads.length * THRESHOLDS.ticketInr;

  /* ---------- Exports ---------- */

  const handleExportCsv = () => {
    if (rankedLeads.length === 0) {
      toast.error("No modernization leads to export.");
      return;
    }
    const headers = [
      "Rank",
      "Unit_ID",
      "Site",
      "City",
      "Install_Year",
      "Age_Years",
      "Main_Rope_Condition_pct",
      "Vibration_RMS_g",
      "Motor_Temp_C",
      "Current_Draw_A",
      "Leveling_Accuracy_mm",
      "Modernization_Score",
      "Status",
      "Estimated_Ticket_INR",
      "Reasons",
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = rankedLeads.map((u, i) => [
      i + 1,
      u.Unit_ID,
      u.Site,
      u.City,
      u.Install_Year,
      u.age,
      u.Main_Rope_Condition.toFixed(2),
      u.Vibration_RMS.toFixed(4),
      u.Motor_Temp_C.toFixed(2),
      u.Current_Draw_A.toFixed(2),
      u.Leveling_Accuracy_mm.toFixed(2),
      u.score.toFixed(3),
      u.status,
      THRESHOLDS.ticketInr,
      leadReasons(u).join(" | "),
    ]);
    const csv =
      headers.map(escape).join(",") +
      "\n" +
      rows.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Fujitec-Modernization-Pipeline-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rankedLeads.length} leads`);
  };

  const handleExportPdf = async () => {
    const node = reportRef.current;
    if (!node) return;
    setExportingPdf(true);
    try {
      // Defer one tick so the spinner state paints.
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = await html2canvas(node, {
        backgroundColor: "#0B1220",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "p" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const usableW = pageW - margin * 2;
      const ratio = canvas.height / canvas.width;
      const imgH = usableW * ratio;

      // Slice tall image across pages.
      let remainingH = imgH;
      let offsetY = 0;
      const sliceCanvas = document.createElement("canvas");
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable");

      const pxPerPdfPt = canvas.width / usableW;
      const pageContentH = pageH - margin * 2;
      const pageContentPx = pageContentH * pxPerPdfPt;

      while (remainingH > 0) {
        const sliceH = Math.min(pageContentPx, canvas.height - offsetY);
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        ctx.fillStyle = "#0B1220";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceH,
          0,
          0,
          canvas.width,
          sliceH,
        );
        const slice = sliceCanvas.toDataURL("image/jpeg", 0.9);
        const sliceHpt = sliceH / pxPerPdfPt;
        if (offsetY > 0) pdf.addPage();
        pdf.addImage(slice, "JPEG", margin, margin, usableW, sliceHpt);
        offsetY += sliceH;
        remainingH -= sliceHpt;
      }

      // Suppress the imported icon variable lint complaint by referencing it.
      void imgData;

      pdf.save(`Fujitec-Executive-Summary-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Executive summary PDF generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Executive Reports
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Board-ready summary of fleet risk, sales pipeline and safety
            compliance ·{" "}
            <span className="font-mono text-foreground">
              {source === "csv" ? `CSV — ${fileName}` : "Archetype dataset"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 border-border bg-surface text-[12px] text-foreground"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export Modernization Leads (CSV)
          </Button>
          <Button
            size="sm"
            disabled={exportingPdf}
            onClick={handleExportPdf}
            className="h-9 gap-1.5 bg-brand text-[12px] font-medium text-brand-foreground hover:bg-brand/90"
          >
            {exportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {exportingPdf ? "Generating PDF…" : "Export Executive Summary (PDF)"}
          </Button>
        </div>
      </div>

      {/* The captured region */}
      <div ref={reportRef} className="space-y-5 bg-background pb-2">
        {/* Branded report header (visible in PDF) */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand/30 bg-brand/10 text-brand">
              <FileBarChart className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Fujitec Pulse · IIoT Intelligence
              </div>
              <div className="text-[15px] font-semibold tracking-tight text-foreground">
                Executive Fleet Summary
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-mono">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span className="font-mono">{units.length} units monitored</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <FleetRiskCard
            healthy={summary.healthy}
            warning={summary.warning}
            critical={summary.critical}
            total={summary.total}
          />
          <PipelineCard leads={leads.length} revenueInr={revenueInr} />
          <SafetyCard count={safetyHazards.length} total={summary.total} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <HealthDonut summary={summary} />
          <ReadinessChart data={readinessData} />
        </div>

        <ScoreHistogram summary={summary} />

        {/* Top 10 leads (PDF content) */}
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">
                Top 10 Modernization Leads
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Ranked by Modernization Score
            </span>
          </div>
          {top10.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-muted-foreground">
              No modernization leads in the current dataset.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-surface/60 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Unit ID</th>
                    <th className="px-3 py-2">Site / City</th>
                    <th className="px-3 py-2">Install</th>
                    <th className="px-3 py-2">Rope %</th>
                    <th className="px-3 py-2">Vibration</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((u, i) => (
                    <tr key={u.Unit_ID} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">
                        {u.Unit_ID}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {u.Site}
                        <span className="ml-1 text-muted-foreground">
                          · {u.City}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {u.Install_Year}
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">
                        {u.Main_Rope_Condition.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">
                        {u.Vibration_RMS.toFixed(3)}g
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">
                        {u.score.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={u.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Confidential · Fujitec Pulse · Generated{" "}
          {new Date().toLocaleString("en-IN", { hour12: false })}
        </div>
      </div>
    </>
  );
}

/* ---------- Cards ---------- */

function FleetRiskCard({
  healthy,
  warning,
  critical,
  total,
}: {
  healthy: number;
  warning: number;
  critical: number;
  total: number;
}) {
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Fleet Risk Profile
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/30 bg-brand/10 text-brand">
          <Activity className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-3 font-mono text-[26px] font-semibold tracking-tight text-foreground">
        {total}
        <span className="ml-1 text-[12px] text-muted-foreground">units</span>
      </div>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div style={{ width: `${pct(healthy)}%`, background: "var(--healthy)" }} />
        <div style={{ width: `${pct(warning)}%`, background: "var(--warning)" }} />
        <div style={{ width: `${pct(critical)}%`, background: "var(--critical)" }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <RiskCell label="Normal" value={healthy} pct={pct(healthy)} dot="bg-healthy" />
        <RiskCell label="Warning" value={warning} pct={pct(warning)} dot="bg-warning" />
        <RiskCell label="Critical" value={critical} pct={pct(critical)} dot="bg-critical" />
      </div>
    </article>
  );
}

function RiskCell({
  label,
  value,
  pct,
  dot,
}: {
  label: string;
  value: number;
  pct: number;
  dot: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/40 px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[14px] text-foreground">
        {value}
        <span className="ml-1 text-[10px] text-muted-foreground">{pct}%</span>
      </div>
    </div>
  );
}

function PipelineCard({ leads, revenueInr }: { leads: number; revenueInr: number }) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Modernization Pipeline
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-warning/30 bg-warning/10 text-warning">
          <TrendingUp className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[26px] font-semibold tracking-tight text-foreground">
          {leads}
        </span>
        <span className="text-[12px] text-muted-foreground">qualified leads</span>
      </div>
      <div className="mt-3 rounded-md border border-healthy/30 bg-healthy/10 p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-healthy">
          <IndianRupee className="h-3 w-3" />
          Revenue Opportunity
        </div>
        <div className="mt-1 font-mono text-[20px] font-semibold tracking-tight text-foreground">
          {formatInrCompact(revenueInr)}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {leads} × ₹27.5L average modernization ticket
        </div>
      </div>
    </article>
  );
}

function SafetyCard({ count, total }: { count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const danger = count > 0;
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Safety Compliance
        </span>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md border",
            danger
              ? "border-critical/30 bg-critical/10 text-critical"
              : "border-healthy/30 bg-healthy/10 text-healthy",
          )}
        >
          {danger ? (
            <ShieldAlert className="h-3.5 w-3.5" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-[26px] font-semibold tracking-tight",
            danger ? "text-critical" : "text-foreground",
          )}
        >
          {count}
        </span>
        <span className="text-[12px] text-muted-foreground">
          units · Rope &lt; 96%
        </span>
      </div>
      <div className="mt-3 rounded-md border border-border bg-surface/40 p-2.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-warning" />
          {pct}% of fleet flagged for rope inspection
        </div>
        <div className="mt-1.5 text-[10px] uppercase tracking-[0.12em]">
          Industry replacement threshold: 94%
        </div>
      </div>
    </article>
  );
}

/* ---------- Readiness chart ---------- */

function ReadinessChart({
  data,
}: {
  data: { bracket: string; count: number; key: "0-5" | "6-15" | "16-25" | "25+" }[];
}) {
  const colorFor = (key: string) => {
    if (key === "25+") return "var(--critical)";
    if (key === "16-25") return "var(--warning)";
    if (key === "6-15") return "var(--brand)";
    return "var(--healthy)";
  };
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-brand" />
          Modernization Readiness — by age bracket
        </h3>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          install age
        </span>
      </div>
      <div className="mt-3 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="bracket"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--brand) 8%, transparent)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.key} fill={colorFor(d.key)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <Legend dot="bg-healthy" label="0-5 yrs · pristine" />
        <Legend dot="bg-brand" label="6-15 yrs · monitor" />
        <Legend dot="bg-warning" label="16-25 yrs · plan upgrade" />
        <Legend dot="bg-critical" label="25+ yrs · modernize now" />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-sm", dot)} />
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: ScoredUnit["status"] }) {
  const cls =
    status === "critical"
      ? "border-critical/40 bg-critical/15 text-critical"
      : status === "warning"
        ? "border-warning/40 bg-warning/15 text-warning"
        : "border-healthy/40 bg-healthy/15 text-healthy";
  const label = status === "critical" ? "Critical" : status === "warning" ? "Warning" : "Normal";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        cls,
      )}
    >
      <Building2 className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
