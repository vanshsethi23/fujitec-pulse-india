import { useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Gauge,
  MapPin,
  Sparkles,
  Thermometer,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ScoredUnit, UnitStatus } from "@/lib/fleet";
import { useFleetData, type TelemetryPoint } from "@/components/fleet/fleet-data-context";

// Engineering alert thresholds for the inspector charts.
const THRESH = {
  motorTempC: 75,
  currentA: 22,
} as const;

const STATUS_META: Record<UnitStatus, { label: string; cls: string; dot: string }> = {
  healthy: {
    label: "Normal",
    cls: "border-healthy/40 bg-healthy/15 text-healthy",
    dot: "bg-healthy shadow-[0_0_8px_var(--healthy)]",
  },
  warning: {
    label: "Warning",
    cls: "border-warning/40 bg-warning/15 text-warning",
    dot: "bg-warning shadow-[0_0_8px_var(--warning)]",
  },
  critical: {
    label: "Critical",
    cls: "border-critical/40 bg-critical/15 text-critical",
    dot: "bg-critical shadow-[0_0_8px_var(--critical)]",
  },
};

interface DiagnosticFinding {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

/**
 * Rule-based health assessment derived from telemetry + asset age.
 * Mirrors the brief: bearing fatigue, leveling-safety, plus secondary checks.
 */
function generateDiagnostic(unit: ScoredUnit): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  if (unit.Vibration_RMS > 0.2 && unit.age > 20) {
    findings.push({
      severity: "critical",
      title: "Immediate mechanical overhaul recommended",
      detail: `Vibration RMS at ${unit.Vibration_RMS.toFixed(3)}g on a ${unit.age}-year-old unit indicates advanced bearing fatigue. Schedule overhaul within 14 days to avoid unscheduled downtime.`,
    });
  }

  if (unit.Leveling_Accuracy_mm > 10) {
    findings.push({
      severity: "critical",
      title: "Safety risk: leveling drift exceeds limits",
      detail: `Leveling error of ${unit.Leveling_Accuracy_mm.toFixed(1)}mm exceeds the 10mm safety threshold. Brake adjustment and traction-sheave inspection required before next service window.`,
    });
  }

  if (unit.Motor_Temp_C > THRESH.motorTempC) {
    findings.push({
      severity: "warning",
      title: "Motor running hot",
      detail: `Motor temperature ${unit.Motor_Temp_C.toFixed(1)}°C is above the ${THRESH.motorTempC}°C alert. Verify cooling, gear oil level and load profile.`,
    });
  }

  if (unit.Current_Draw_A > THRESH.currentA) {
    findings.push({
      severity: "warning",
      title: "Elevated electrical strain",
      detail: `Current draw ${unit.Current_Draw_A.toFixed(1)}A exceeds the ${THRESH.currentA}A guideline. Inspect drive harmonics and counterweight balance.`,
    });
  }

  if (unit.Main_Rope_Condition < 94) {
    findings.push({
      severity: "critical",
      title: "Main rope at replacement threshold",
      detail: `Main Rope Condition at ${unit.Main_Rope_Condition.toFixed(1)}% is below the 94% industry safety limit. Immediate shutdown and rope replacement required.`,
    });
  } else if (unit.Main_Rope_Condition < 96) {
    findings.push({
      severity: "warning",
      title: "Main rope thinning",
      detail: `Main Rope Condition at ${unit.Main_Rope_Condition.toFixed(1)}% is in the 94–96% planning zone. Schedule rope replacement before the next inspection cycle.`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      title: "No critical anomalies detected",
      detail: "All monitored channels are within nominal operating envelopes. Continue routine preventive maintenance.",
    });
  }

  return findings;
}

interface UnitDetailSheetProps {
  unitId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDetailSheet({ unitId, open, onOpenChange }: UnitDetailSheetProps) {
  const { units, getTimeseries, source } = useFleetData();
  const unit = useMemo(
    () => (unitId ? units.find((u) => u.Unit_ID === unitId) ?? null : null),
    [unitId, units],
  );
  const series = useMemo(() => (unit ? getTimeseries(unit.Unit_ID) : []), [unit, getTimeseries]);
  const findings = useMemo(() => (unit ? generateDiagnostic(unit) : []), [unit]);

  const seriesMeta = useMemo(() => {
    if (!series.length) return null;
    return {
      first: series[0].label,
      last: series[series.length - 1].label,
      count: series.length,
    };
  }, [series]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden border-l border-border bg-card p-0 sm:max-w-[640px]"
      >
        {unit ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <SheetHeader className="space-y-3 border-b border-border bg-surface/40 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <Gauge className="h-3 w-3" />
                    Unit Inspector
                  </div>
                  <SheetTitle className="mt-1 font-mono text-[20px] font-semibold tracking-tight text-foreground">
                    {unit.Unit_ID}
                  </SheetTitle>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {unit.Site}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {unit.City}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Installed {unit.Install_Year} · {unit.age}y old
                    </span>
                  </SheetDescription>
                </div>
                <StatusBadge status={unit.status} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Score" value={unit.score.toFixed(2)} />
                <MiniStat
                  label="Vibration"
                  value={`${unit.Vibration_RMS.toFixed(3)}g`}
                />
                <MiniStat
                  label="Bearing"
                  value={unit.Bearing_Health_Index.toFixed(2)}
                />
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-5 p-6">
                {/* Telemetry section header */}
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">
                      Telemetry channels
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {seriesMeta
                        ? `${seriesMeta.count} samples · ${seriesMeta.first} → ${seriesMeta.last}`
                        : "No samples available"}
                      {source === "mock" && (
                        <span className="ml-1 italic">(synthetic preview)</span>
                      )}
                    </p>
                  </div>
                </div>

                <ChartCard
                  icon={Thermometer}
                  title="Motor Health"
                  unit="°C"
                  current={unit.Motor_Temp_C}
                  threshold={THRESH.motorTempC}
                  data={series}
                  dataKey="Motor_Temp_C"
                  color="var(--critical)"
                />

                <ChartCard
                  icon={Zap}
                  title="Electrical Strain"
                  unit="A"
                  current={unit.Current_Draw_A}
                  threshold={THRESH.currentA}
                  data={series}
                  dataKey="Current_Draw_A"
                  color="var(--brand)"
                />

                {/* AI diagnostic */}
                <section className="space-y-3 rounded-md border border-border bg-surface/40 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/40 bg-brand/10 text-brand">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground">
                        Automated Health Assessment
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Rule-based diagnostic synthesized from current telemetry + asset age.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {findings.map((f, i) => (
                      <FindingRow key={i} finding={f} />
                    ))}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            Select a unit to inspect.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ status }: { status: UnitStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        meta.cls,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

interface ChartCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  unit: string;
  current: number;
  threshold: number;
  data: TelemetryPoint[];
  dataKey: keyof TelemetryPoint;
  color: string;
}

function ChartCard({
  icon: Icon,
  title,
  unit,
  current,
  threshold,
  data,
  dataKey,
  color,
}: ChartCardProps) {
  const breached = current > threshold;
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-foreground">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
            <p className="text-[11px] text-muted-foreground">
              Alert threshold ·{" "}
              <span className="font-mono text-foreground">
                {threshold}
                {unit}
              </span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Current
          </div>
          <div
            className={cn(
              "font-mono text-[16px] font-semibold tabular-nums",
              breached ? "text-critical" : "text-foreground",
            )}
          >
            {current.toFixed(1)}
            <span className="ml-0.5 text-[11px] text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-[180px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            No telemetry samples for this unit.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                width={42}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v: number) => [`${Number(v).toFixed(2)}${unit}`, title]}
              />
              <ReferenceLine
                y={threshold}
                stroke="var(--critical)"
                strokeDasharray="4 4"
                label={{
                  value: `Alert ${threshold}${unit}`,
                  position: "insideTopRight",
                  fill: "var(--critical)",
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey as string}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function FindingRow({ finding }: { finding: DiagnosticFinding }) {
  const cls =
    finding.severity === "critical"
      ? "border-critical/30 bg-critical/10 text-critical"
      : finding.severity === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-healthy/30 bg-healthy/10 text-healthy";
  return (
    <div className={cn("flex items-start gap-3 rounded-md border p-3", cls)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <div className="text-[12px] font-semibold leading-snug">{finding.title}</div>
        <div className="text-[11px] leading-relaxed text-foreground/80">{finding.detail}</div>
      </div>
    </div>
  );
}
