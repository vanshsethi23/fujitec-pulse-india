import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type KpiAccent = "brand" | "critical" | "warning" | "healthy";

const ACCENT: Record<KpiAccent, { bar: string; text: string; stroke: string; fill: string }> = {
  brand: {
    bar: "bg-brand",
    text: "text-brand",
    stroke: "var(--brand)",
    fill: "color-mix(in oklab, var(--brand) 22%, transparent)",
  },
  critical: {
    bar: "bg-critical",
    text: "text-critical",
    stroke: "var(--critical)",
    fill: "color-mix(in oklab, var(--critical) 22%, transparent)",
  },
  warning: {
    bar: "bg-warning",
    text: "text-warning",
    stroke: "var(--warning)",
    fill: "color-mix(in oklab, var(--warning) 22%, transparent)",
  },
  healthy: {
    bar: "bg-healthy",
    text: "text-healthy",
    stroke: "var(--healthy)",
    fill: "color-mix(in oklab, var(--healthy) 22%, transparent)",
  },
};

export interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  delta: number; // percent, signed
  deltaPositiveIsGood?: boolean;
  spark: number[];
  accent: KpiAccent;
  icon?: LucideIcon;
}

export function KpiCard({
  label,
  value,
  sublabel,
  delta,
  deltaPositiveIsGood = true,
  spark,
  accent,
  icon: Icon,
}: KpiCardProps) {
  const a = ACCENT[accent];
  const data = spark.map((y, i) => ({ i, y }));
  const up = delta >= 0;
  const good = up ? deltaPositiveIsGood : !deltaPositiveIsGood;
  const deltaColor = good ? "text-healthy" : "text-critical";
  const id = `spark-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-card">
      <div className={cn("absolute left-0 top-0 h-full w-[3px]", a.bar)} />
      <div className="flex items-start justify-between px-4 pt-3.5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {Icon && <Icon className={cn("h-3.5 w-3.5", a.text)} />}
          {label}
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            deltaColor,
            good ? "bg-healthy/10" : "bg-critical/10",
          )}
        >
          {up ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <div className="px-4 pb-1 pt-1.5">
        <div className="font-mono text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {value}
        </div>
        {sublabel && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</div>
        )}
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={a.stroke} stopOpacity={0.5} />
                <stop offset="100%" stopColor={a.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="y"
              stroke={a.stroke}
              strokeWidth={1.5}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
