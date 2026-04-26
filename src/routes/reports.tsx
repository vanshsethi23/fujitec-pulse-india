import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  const { units, source, fileName, averageTicketInr } = useFleetData();
  const summary = useMemo(() => summarize(units, averageTicketInr), [units, averageTicketInr]);
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

  const revenueInr = leads.length * averageTicketInr;

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
      averageTicketInr,
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
    setExportingPdf(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      buildExecutivePdf({
        total: summary.total,
        healthy: summary.healthy,
        warning: summary.warning,
        critical: summary.critical,
        leadsCount: leads.length,
        revenueInr,
        averageTicketInr,
        safetyCount: safetyHazards.length,
        readiness: readinessData,
        top10,
        sourceLabel: source === "csv" ? `CSV — ${fileName}` : "Archetype dataset",
      });
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
      <div className="space-y-5 bg-background pb-2">
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
          <PipelineCard leads={leads.length} revenueInr={revenueInr} averageTicketInr={averageTicketInr} />
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

function PipelineCard({
  leads,
  revenueInr,
  averageTicketInr,
}: {
  leads: number;
  revenueInr: number;
  averageTicketInr: number;
}) {
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
          {leads} × {formatInrCompact(averageTicketInr)} average modernization ticket
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

/* ---------- Native jsPDF Executive Summary ---------- */

interface PdfData {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  leadsCount: number;
  revenueInr: number;
  averageTicketInr: number;
  safetyCount: number;
  readiness: { bracket: string; count: number; key: string }[];
  top10: ScoredUnit[];
  sourceLabel: string;
}

function buildExecutivePdf(d: PdfData): void {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "p" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;

  // Brand palette (hex equivalents of the dark theme tokens).
  const C = {
    bg: [11, 18, 32] as const,
    text: [240, 244, 250] as const,
    muted: [148, 163, 184] as const,
    brand: [30, 99, 214] as const,
    healthy: [16, 185, 129] as const,
    warning: [245, 158, 11] as const,
    critical: [239, 68, 68] as const,
    cardBorder: [40, 50, 70] as const,
  };

  const fillBg = () => {
    pdf.setFillColor(C.bg[0], C.bg[1], C.bg[2]);
    pdf.rect(0, 0, pageW, pageH, "F");
  };
  fillBg();

  // Header bar
  pdf.setFillColor(C.brand[0], C.brand[1], C.brand[2]);
  pdf.rect(0, 0, pageW, 6, "F");

  // Title block
  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("FUJITEC PULSE  ·  IIoT INTELLIGENCE", margin, margin + 4);

  pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("Executive Fleet Summary", margin, margin + 28);

  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  pdf.text(
    `${today}  ·  ${d.total} units monitored  ·  ${d.sourceLabel}`,
    margin,
    margin + 44,
  );

  // ---- Three KPI cards ----
  const cardTop = margin + 64;
  const cardH = 110;
  const gap = 10;
  const cardW = (pageW - margin * 2 - gap * 2) / 3;

  const drawCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    value: string,
    valueColor: readonly [number, number, number],
    sub: string,
  ) => {
    pdf.setDrawColor(C.cardBorder[0], C.cardBorder[1], C.cardBorder[2]);
    pdf.setFillColor(17, 24, 39);
    pdf.roundedRect(x, y, w, h, 6, 6, "FD");

    pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(title.toUpperCase(), x + 14, y + 20);

    pdf.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.text(value, x + 14, y + 56);

    pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(sub, w - 28);
    pdf.text(lines, x + 14, y + 78);
  };

  drawCard(
    margin,
    cardTop,
    cardW,
    cardH,
    "Fleet Risk Profile",
    String(d.total),
    C.text,
    `Normal ${d.healthy}  ·  Warning ${d.warning}  ·  Critical ${d.critical}`,
  );
  drawCard(
    margin + cardW + gap,
    cardTop,
    cardW,
    cardH,
    "Modernization Pipeline",
    String(d.leadsCount),
    C.warning,
    `Revenue Opportunity ${formatInrCompact(d.revenueInr)}\n${d.leadsCount} leads × ${formatInrCompact(d.averageTicketInr)} ATV`,
  );
  drawCard(
    margin + (cardW + gap) * 2,
    cardTop,
    cardW,
    cardH,
    "Safety Compliance",
    String(d.safetyCount),
    C.critical,
    `Units with Rope < 96%\nIndustry threshold: 94%`,
  );

  // ---- Risk distribution stacked bar ----
  const barY = cardTop + cardH + 24;
  pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Fleet Health Distribution", margin, barY);

  const totalSafe = Math.max(1, d.total);
  const fullW = pageW - margin * 2;
  const segH = 14;
  const segY = barY + 10;
  const wH = (d.healthy / totalSafe) * fullW;
  const wW = (d.warning / totalSafe) * fullW;
  const wC = (d.critical / totalSafe) * fullW;

  pdf.setFillColor(C.healthy[0], C.healthy[1], C.healthy[2]);
  pdf.rect(margin, segY, wH, segH, "F");
  pdf.setFillColor(C.warning[0], C.warning[1], C.warning[2]);
  pdf.rect(margin + wH, segY, wW, segH, "F");
  pdf.setFillColor(C.critical[0], C.critical[1], C.critical[2]);
  pdf.rect(margin + wH + wW, segY, wC, segH, "F");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  const pct = (n: number) => Math.round((n / totalSafe) * 100);
  pdf.text(
    `Healthy ${d.healthy} (${pct(d.healthy)}%)   Warning ${d.warning} (${pct(d.warning)}%)   Critical ${d.critical} (${pct(d.critical)}%)`,
    margin,
    segY + segH + 14,
  );

  // ---- Readiness by age ----
  const readinessY = segY + segH + 36;
  pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Modernization Readiness — by age bracket", margin, readinessY);

  const chartY = readinessY + 10;
  const chartH = 110;
  const cellW = (pageW - margin * 2) / d.readiness.length;
  const maxCount = Math.max(1, ...d.readiness.map((r) => r.count));
  const colorByKey = (k: string): readonly [number, number, number] => {
    if (k === "25+") return C.critical;
    if (k === "16-25") return C.warning;
    if (k === "6-15") return C.brand;
    return C.healthy;
  };
  for (let i = 0; i < d.readiness.length; i++) {
    const r = d.readiness[i];
    const h = (r.count / maxCount) * (chartH - 24);
    const x = margin + i * cellW + 12;
    const y = chartY + (chartH - h - 16);
    const col = colorByKey(r.key);
    pdf.setFillColor(col[0], col[1], col[2]);
    pdf.rect(x, y, cellW - 24, h, "F");
    pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(r.count), x + (cellW - 24) / 2, y - 4, { align: "center" });
    pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(r.bracket, x + (cellW - 24) / 2, chartY + chartH, { align: "center" });
  }

  // ---- Page 2: Top 10 leads ----
  pdf.addPage();
  fillBg();
  pdf.setFillColor(C.brand[0], C.brand[1], C.brand[2]);
  pdf.rect(0, 0, pageW, 6, "F");

  pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Top 10 Modernization Leads", margin, margin + 18);

  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Ranked by Modernization Score", margin, margin + 32);

  const tableTop = margin + 50;
  const cols = [
    { label: "#", w: 22 },
    { label: "Unit ID", w: 70 },
    { label: "Site / City", w: 150 },
    { label: "Install", w: 50 },
    { label: "Rope %", w: 50 },
    { label: "Vib (g)", w: 55 },
    { label: "Score", w: 50 },
    { label: "Status", w: 60 },
  ];
  let cx = margin;
  pdf.setFillColor(22, 30, 46);
  pdf.rect(margin, tableTop, pageW - margin * 2, 22, "F");
  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  for (const c of cols) {
    pdf.text(c.label.toUpperCase(), cx + 6, tableTop + 14);
    cx += c.w;
  }

  let ry = tableTop + 22;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  d.top10.forEach((u, i) => {
    if (i % 2 === 0) {
      pdf.setFillColor(15, 22, 36);
      pdf.rect(margin, ry, pageW - margin * 2, 22, "F");
    }
    let x = margin;
    const cells = [
      String(i + 1),
      u.Unit_ID,
      `${u.Site} · ${u.City}`,
      String(u.Install_Year),
      `${u.Main_Rope_Condition.toFixed(1)}%`,
      u.Vibration_RMS.toFixed(3),
      u.score.toFixed(2),
      u.status === "critical"
        ? "CRITICAL"
        : u.status === "warning"
          ? "WARNING"
          : "NORMAL",
    ];
    cells.forEach((val, idx) => {
      const c = cols[idx];
      if (idx === 7) {
        const col =
          u.status === "critical"
            ? C.critical
            : u.status === "warning"
              ? C.warning
              : C.healthy;
        pdf.setTextColor(col[0], col[1], col[2]);
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
        pdf.setFont("helvetica", "normal");
      }
      const truncated = pdf.splitTextToSize(val, c.w - 8)[0] ?? val;
      pdf.text(truncated, x + 6, ry + 14);
      x += c.w;
    });
    ry += 22;
  });

  // Footer
  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Confidential · Fujitec Pulse · Generated ${new Date().toLocaleString("en-IN", { hour12: false })}`,
    margin,
    pageH - 24,
  );

  pdf.save(`Fujitec-Executive-Summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}
