import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { FleetSummary } from "@/lib/fleet";

const COLORS: Record<string, string> = {
  healthy: "var(--healthy)",
  warning: "var(--warning)",
  critical: "var(--critical)",
};

export function HealthDonut({ summary }: { summary: FleetSummary }) {
  const total = summary.total;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Fleet Health Distribution</h3>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {total} units
        </span>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--foreground)" }}
              />
              <Pie
                data={summary.distribution}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={80}
                strokeWidth={0}
                paddingAngle={1.5}
                isAnimationActive={false}
              >
                {summary.distribution.map((d) => (
                  <Cell key={d.key} fill={COLORS[d.key]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[22px] font-semibold text-foreground">
              {Math.round(((summary.healthy + summary.warning) / total) * 100)}%
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Operational
            </span>
          </div>
        </div>

        <ul className="flex-1 space-y-2 text-[12px]">
          {summary.distribution.map((d) => (
            <li key={d.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: COLORS[d.key] }}
                />
                {d.name}
              </span>
              <span className="font-mono text-foreground">
                {d.value}
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  {((d.value / total) * 100).toFixed(0)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
