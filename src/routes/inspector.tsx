import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bolt,
  Building2,
  CalendarClock,
  Check,
  ChevronsUpDown,
  CircuitBoard,
  Clock,
  Cog,
  Gauge,
  MapPin,
  Radar,
  Ruler,
  Search,
  Sparkles,
  Thermometer,
  Waves,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ScoredUnit, UnitStatus } from "@/lib/fleet";
import {
  useFleetData,
  type TelemetryPoint,
} from "@/components/fleet/fleet-data-context";
import { supabase } from "@/integrations/supabase/client";
import { TicketDialog } from "@/components/fleet/ticket-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/inspector")({
  head: () => ({
    meta: [
      { title: "Unit Inspector — Fujitec Pulse" },
      {
        name: "description",
        content:
          "Per-unit deep dive across all sensor channels with synchronized 30-day trends and AI engineering verdict.",
      },
      { property: "og:title", content: "Unit Inspector — Fujitec Pulse" },
      {
        property: "og:description",
        content:
          "Synchronized telemetry charts, technical KPIs, and AI verdict for any Fujitec elevator.",
      },
    ],
  }),
  component: InspectorPage,
});

const THRESH = {
  motorTempC: 75,
  currentA: 22,
  vibrationRms: 0.15,
  levelingMm: 10,
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

function InspectorPage() {
  return (
    <AppShell crumb="Unit Inspector">
      <InspectorBody />
    </AppShell>
  );
}

function InspectorBody() {
  const { units, selectedUnitId, setSelectedUnitId, getTimeseries, source } =
    useFleetData();
  const [ticketOpen, setTicketOpen] = useState(false);

  const unit = useMemo(
    () => units.find((u) => u.Unit_ID === selectedUnitId) ?? null,
    [units, selectedUnitId],
  );

  const fullSeries = useMemo(
    () => (unit ? getTimeseries(unit.Unit_ID) : []),
    [unit, getTimeseries],
  );

  // Last 30 days only
  const series = useMemo(() => {
    if (!fullSeries.length) return [];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const trimmed = fullSeries.filter((s) => s.t >= cutoff);
    return trimmed.length ? trimmed : fullSeries;
  }, [fullSeries]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Unit Inspector
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Comprehensive sensor-channel deep dive · synchronized 30-day pulse
            graphs · AI engineering verdict
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!unit}
            onClick={() => setTicketOpen(true)}
            className="h-10 border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning"
          >
            <Wrench className="mr-1.5 h-3.5 w-3.5" />
            Create Service Ticket
          </Button>
          <UnitPicker
            units={units}
            value={unit?.Unit_ID ?? null}
            onChange={setSelectedUnitId}
          />
        </div>
      </div>

      {!unit ? (
        <EmptyState hasUnits={units.length > 0} />
      ) : (
        <div className="space-y-5">
          <UnitHeaderCard unit={unit} sampleCount={series.length} source={source} />
          <PulseGrid series={series} />
          <KpiGrid unit={unit} series={series} />
          <AiAssessment unit={unit} series={series} />
        </div>
      )}

      <TicketDialog unit={unit} open={ticketOpen} onOpenChange={setTicketOpen} />
    </>
  );
}

/* ---------------- Unit picker ---------------- */

function UnitPicker({
  units,
  value,
  onChange,
}: {
  units: ScoredUnit[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = units.find((u) => u.Unit_ID === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-[320px] justify-between border-border bg-surface text-[13px] text-foreground"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{selected.Unit_ID}</span>
              <span className="truncate text-muted-foreground">
                · {selected.Site}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              Select a Unit ID to inspect…
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] border-border bg-card p-0" align="end">
        <Command>
          <CommandInput placeholder="Search Unit ID, site, city…" className="text-[13px]" />
          <CommandList>
            <CommandEmpty>No matching units.</CommandEmpty>
            <CommandGroup>
              {units.map((u) => (
                <CommandItem
                  key={u.Unit_ID}
                  value={`${u.Unit_ID} ${u.Site} ${u.City}`}
                  onSelect={() => {
                    onChange(u.Unit_ID);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        value === u.Unit_ID ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-foreground">{u.Unit_ID}</span>
                    <span className="text-muted-foreground">{u.Site}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
                      STATUS_META[u.status].cls,
                    )}
                  >
                    {u.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Empty state ---------------- */

function EmptyState({ hasUnits }: { hasUnits: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 px-6 py-20 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand">
          <Radar className="h-7 w-7" />
        </span>
      </div>
      <h2 className="text-[16px] font-semibold text-foreground">
        Please select a Unit to inspect
      </h2>
      <p className="mt-2 max-w-md text-[12px] text-muted-foreground">
        {hasUnits
          ? "Use the picker in the top-right, or click any Unit ID across Fleet Overview and Modernization Leads — it will jump straight here."
          : "No units are loaded yet. Upload a telemetry CSV from Fleet Overview to get started."}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 text-muted-foreground">
        <EmptyStat icon={Thermometer} label="Thermal Profile" />
        <EmptyStat icon={Waves} label="Kinematic Vibration" />
        <EmptyStat icon={Bolt} label="Electrical Strain" />
      </div>
    </div>
  );
}

function EmptyStat({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface/40 px-3 py-2 text-[11px]">
      <Icon className="h-3.5 w-3.5 text-brand/80" />
      <span>{label}</span>
    </div>
  );
}

/* ---------------- Unit Header Card ---------------- */

function UnitHeaderCard({
  unit,
  sampleCount,
  source,
}: {
  unit: ScoredUnit;
  sampleCount: number;
  source: "mock" | "csv";
}) {
  const meta = STATUS_META[unit.status];
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Gauge className="h-3 w-3" />
            Unit Inspector
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="font-mono text-[24px] font-semibold tracking-tight text-foreground">
              {unit.Unit_ID}
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                meta.cls,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {unit.Site}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {unit.City}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Installed {unit.Install_Year} · {unit.age}y old
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {sampleCount} samples
              {source === "mock" && (
                <span className="italic text-muted-foreground/70">
                  (synthetic preview)
                </span>
              )}
            </span>
          </div>
        </div>

        <HealthGauge score={unit.score} status={unit.status} />
      </div>
    </section>
  );
}

function HealthGauge({ score, status }: { score: number; status: UnitStatus }) {
  // Health = 1 − modernization score (higher = healthier).
  const health = Math.max(0, Math.min(1, 1 - score));
  const pct = Math.round(health * 100);
  const color =
    status === "critical"
      ? "var(--critical)"
      : status === "warning"
        ? "var(--warning)"
        : "var(--healthy)";

  // Half-donut math
  const radius = 56;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - health);

  return (
    <div className="flex items-end gap-4">
      <div className="relative h-[80px] w-[140px]">
        <svg viewBox="0 0 140 80" className="h-full w-full">
          <path
            d="M14,72 A56,56 0 0,1 126,72"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M14,72 A56,56 0 0,1 126,72"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span
            className="font-mono text-[24px] font-semibold tabular-nums leading-none"
            style={{ color }}
          >
            {pct}
          </span>
          <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Health Score
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Pulse grid (4 synced charts) ---------------- */

function PulseGrid({ series }: { series: TelemetryPoint[] }) {
  const empty = series.length === 0;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">
            Pulse — last 30 days
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Synchronized cursors · hovering one chart highlights the same
            timestamp across all four channels.
          </p>
        </div>
      </div>

      {empty ? (
        <div className="rounded-md border border-dashed border-border bg-card/50 p-12 text-center text-[12px] text-muted-foreground">
          No telemetry samples in the last 30 days for this unit.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ChartFrame
            icon={Thermometer}
            title="Thermal Profile"
            subtitle="Motor_Temp_C"
            unit="°C"
            current={series[series.length - 1].Motor_Temp_C}
            threshold={THRESH.motorTempC}
            color="var(--critical)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                syncId="unit-pulse"
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
              >
                <defs>
                  <linearGradient id="thermalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--critical)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--critical)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                <Tooltip content={<SyncedTooltip />} />
                <ReferenceLine
                  y={THRESH.motorTempC}
                  stroke="var(--critical)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Alert ${THRESH.motorTempC}°C`,
                    position: "insideTopRight",
                    fill: "var(--critical)",
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Motor_Temp_C"
                  stroke="var(--critical)"
                  strokeWidth={2}
                  fill="url(#thermalFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            icon={Waves}
            title="Kinematic Vibration"
            subtitle="Vibration_RMS"
            unit="g"
            current={series[series.length - 1].Vibration_RMS}
            threshold={THRESH.vibrationRms}
            color="var(--brand)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                syncId="unit-pulse"
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
              >
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
                <Tooltip content={<SyncedTooltip />} />
                <ReferenceLine
                  y={THRESH.vibrationRms}
                  stroke="var(--warning)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Concern ${THRESH.vibrationRms}g`,
                    position: "insideTopRight",
                    fill: "var(--warning)",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Vibration_RMS"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            icon={Bolt}
            title="Electrical Strain"
            subtitle="Current_Draw_A"
            unit="A"
            current={series[series.length - 1].Current_Draw_A}
            threshold={THRESH.currentA}
            color="var(--chart-3)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                syncId="unit-pulse"
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
              >
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
                <Tooltip content={<SyncedTooltip />} />
                <ReferenceLine
                  y={THRESH.currentA}
                  stroke="var(--critical)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Alert ${THRESH.currentA}A`,
                    position: "insideTopRight",
                    fill: "var(--critical)",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Current_Draw_A"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            icon={Ruler}
            title="Precision / Leveling"
            subtitle="Leveling_Accuracy_mm"
            unit="mm"
            current={series[series.length - 1].Leveling_Accuracy_mm}
            threshold={THRESH.levelingMm}
            color="var(--chart-5)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                syncId="unit-pulse"
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
              >
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
                <Tooltip content={<SyncedTooltip />} />
                <ReferenceLine
                  y={THRESH.levelingMm}
                  stroke="var(--critical)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Safety ${THRESH.levelingMm}mm`,
                    position: "insideTopRight",
                    fill: "var(--critical)",
                    fontSize: 10,
                  }}
                />
                <Bar
                  dataKey="Leveling_Accuracy_mm"
                  fill="var(--chart-5)"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      )}
    </section>
  );
}

function ChartFrame({
  icon: Icon,
  title,
  subtitle,
  unit,
  current,
  threshold,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  unit: string;
  current: number;
  threshold: number;
  color: string;
  children: React.ReactNode;
}) {
  const breached = current > threshold;
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border"
            style={{ color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Latest
          </div>
          <div
            className={cn(
              "font-mono text-[16px] font-semibold tabular-nums",
              breached ? "text-critical" : "text-foreground",
            )}
          >
            {current.toFixed(unit === "g" ? 3 : 1)}
            <span className="ml-0.5 text-[11px] text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-[200px] w-full">{children}</div>
    </section>
  );
}

interface SyncedPayloadEntry {
  payload?: TelemetryPoint;
}

function SyncedTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: SyncedPayloadEntry[];
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px]">
        <span className="text-muted-foreground">Motor</span>
        <span className="text-right text-foreground">{p.Motor_Temp_C.toFixed(1)} °C</span>
        <span className="text-muted-foreground">Vib</span>
        <span className="text-right text-foreground">{p.Vibration_RMS.toFixed(3)} g</span>
        <span className="text-muted-foreground">Current</span>
        <span className="text-right text-foreground">{p.Current_Draw_A.toFixed(1)} A</span>
        <span className="text-muted-foreground">Leveling</span>
        <span className="text-right text-foreground">{p.Leveling_Accuracy_mm.toFixed(2)} mm</span>
      </div>
    </div>
  );
}

/* ---------------- Technical KPI grid ---------------- */

function KpiGrid({
  unit,
  series,
}: {
  unit: ScoredUnit;
  series: TelemetryPoint[];
}) {
  // Cumulative wear: integrate vibration over the series window.
  // Sum(Vibration_RMS) × sample-interval normalized — stable per-sample sum is fine for display.
  const cumulativeWear = useMemo(() => {
    if (!series.length) return unit.Vibration_RMS * 24;
    return series.reduce((s, p) => s + p.Vibration_RMS, 0);
  }, [series, unit.Vibration_RMS]);

  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-foreground">Technical Stats</h3>
        <p className="text-[11px] text-muted-foreground">
          Engineering KPIs computed from the current dataset for {unit.Unit_ID}.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Clock}
          label="Avg Door Cycle"
          value={`${unit.Door_Open_Close_MS.toFixed(0)} ms`}
          sub="Mean Door_Open_Close_MS"
          tone="neutral"
        />
        <KpiCard
          icon={Cog}
          label="Door Cycles / hr"
          value={unit.Door_Cycles_Hour.toLocaleString("en-IN")}
          sub="Sum Door_Cycles_Hour"
          tone="neutral"
        />
        <KpiCard
          icon={Activity}
          label="Cumulative Wear"
          value={cumulativeWear.toFixed(2)}
          sub="∑ Vibration over window (g·samples)"
          tone={
            cumulativeWear / Math.max(1, series.length) > THRESH.vibrationRms
              ? "warn"
              : "neutral"
          }
        />
        <KpiCard
          icon={CircuitBoard}
          label="Main Rope Condition (%)"
          value={`${unit.Main_Rope_Condition.toFixed(1)}%`}
          sub="Industry replacement at 94%"
          tone={
            unit.Main_Rope_Condition < 94
              ? "critical"
              : unit.Main_Rope_Condition < 96
                ? "warn"
                : "good"
          }
        />
      </div>
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "critical" | "neutral";
}) {
  const accentCls =
    tone === "good"
      ? "text-healthy bg-healthy/10 border-healthy/30"
      : tone === "warn"
        ? "text-warning bg-warning/10 border-warning/30"
        : tone === "critical"
          ? "text-critical bg-critical/10 border-critical/30"
          : "text-brand bg-brand/10 border-brand/30";
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md border",
            accentCls,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 font-mono text-[24px] font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

/* ---------------- AI Assessment ---------------- */

interface Assessment {
  bullets: string[];
  verdict: string;
  verdictReason: string;
}

function AiAssessment({
  unit,
  series,
}: {
  unit: ScoredUnit;
  series: TelemetryPoint[];
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset on unit change
  useEffect(() => {
    setData(null);
    setError(null);
  }, [unit.Unit_ID]);

  const run = async () => {
    if (!series.length) {
      toast.error("No telemetry samples to analyze for this unit.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recent = series.filter((s) => s.t >= cutoff);
      const samples = (recent.length ? recent : series.slice(-24)).map((s) => ({
        t: s.t,
        Motor_Temp_C: s.Motor_Temp_C,
        Current_Draw_A: s.Current_Draw_A,
        Vibration_RMS: s.Vibration_RMS,
        Leveling_Accuracy_mm: s.Leveling_Accuracy_mm,
        Main_Rope_Condition: s.Main_Rope_Condition,
      }));

      const { data: res, error: fnError } = await supabase.functions.invoke(
        "inspector-assessment",
        {
          body: {
            unit: {
              Unit_ID: unit.Unit_ID,
              Site: unit.Site,
              City: unit.City,
              Install_Year: unit.Install_Year,
              age: unit.age,
              score: unit.score,
              status: unit.status,
            },
            samples,
          },
        },
      );

      if (fnError) {
        const msg = fnError.message || "AI assessment failed.";
        setError(msg);
        toast.error(msg);
        return;
      }
      const parsed = (res as { assessment?: Assessment } | null)?.assessment;
      if (!parsed?.bullets?.length) {
        setError("AI returned no findings. Try again in a moment.");
        return;
      }
      setData(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand/40 bg-brand/10 text-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              AI Technical Assessment
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Gemini analyzes the last 24h of sensor trends and returns a
              3-bullet engineering summary plus a maintenance verdict.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={run}
          disabled={loading}
          className="h-9 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Sparkles className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-pulse")} />
          {loading ? "Analyzing…" : data ? "Re-run analysis" : "Generate assessment"}
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md border border-border bg-surface/40"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical/10 p-3 text-[12px] text-critical">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : data ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {data.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-border bg-surface/40 p-3 text-[12px] leading-relaxed text-foreground"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <VerdictBanner verdict={data.verdict} reason={data.verdictReason} />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface/30 p-4 text-[12px] text-muted-foreground">
            Click <span className="font-medium text-foreground">Generate assessment</span>{" "}
            to send the last 24h of data for {unit.Unit_ID} to Gemini.
          </div>
        )}
      </div>
    </section>
  );
}

function VerdictBanner({ verdict, reason }: { verdict: string; reason: string }) {
  const v = verdict.toLowerCase();
  const tone =
    v.includes("immediate")
      ? "critical"
      : v.includes("service")
        ? "warning"
        : v.includes("monitor")
          ? "warning"
          : "healthy";
  const cls =
    tone === "critical"
      ? "border-critical/40 bg-critical/10 text-critical"
      : tone === "warning"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-healthy/40 bg-healthy/10 text-healthy";
  return (
    <div className={cn("rounded-md border p-3", cls)}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
        <Gauge className="h-3 w-3" />
        Verdict · {verdict}
      </div>
      <div className="mt-1 text-[12px] leading-relaxed text-foreground/85">{reason}</div>
    </div>
  );
}
