import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, AlertTriangle, Building2, FileBarChart, IndianRupee, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/fleet/kpi-card";
import { HealthDonut } from "@/components/fleet/health-donut";
import { ScoreHistogram } from "@/components/fleet/score-histogram";
import { UnitsTable } from "@/components/fleet/units-table";
import { Button } from "@/components/ui/button";
import { summarize, formatInrCompact } from "@/lib/fleet";
import { useFleetData } from "@/components/fleet/fleet-data-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fleet Overview — Fujitec Pulse" },
      {
        name: "description",
        content:
          "Executive view of Fujitec elevator fleet health, modernization leads and revenue opportunity.",
      },
    ],
  }),
  component: FleetOverview,
});

// Stable mock spark series per accent.
function spark(seed: number, base: number, drift: number) {
  let s = seed;
  return Array.from({ length: 24 }, (_, i) => {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * drift;
    return +(base + Math.sin(i / 3) * drift * 0.4 + noise).toFixed(3);
  });
}

function FleetOverview() {
  return (
    <AppShell crumb="Fleet Overview">
      <FleetOverviewBody />
    </AppShell>
  );
}

function FleetOverviewBody() {
  const { units, source, fileName } = useFleetData();
  const summary = useMemo(() => summarize(units), [units]);

  const lastSync = useMemo(() => {
    return new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, [units]);

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Executive Fleet Overview
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Last telemetry sync{" "}
            <span className="font-mono text-foreground">{lastSync}</span> · {units.length}{" "}
            units ·{" "}
            <span className="font-mono text-foreground">
              {source === "csv" ? `CSV — ${fileName}` : "Archetype dataset"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="h-9 gap-1.5 bg-brand text-[12px] font-medium text-brand-foreground hover:bg-brand/90"
          >
            <Link to="/reports">
              <FileBarChart className="h-3.5 w-3.5" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Fleet"
          value={summary.total.toString()}
          sublabel="Connected units"
          delta={1.5}
          spark={spark(11, summary.total, 4)}
          accent="brand"
          icon={Building2}
        />
        <KpiCard
          label="Critical Units"
          value={summary.critical.toString()}
          sublabel={`Score ≥ 0.75`}
          delta={4.2}
          deltaPositiveIsGood={false}
          spark={spark(31, summary.critical, 3)}
          accent="critical"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Modernization Leads"
          value={summary.leads.toString()}
          sublabel="Pre-2011 install or Main Rope Condition < 96%"
          delta={6.8}
          spark={spark(53, summary.leads, 3)}
          accent="warning"
          icon={Target}
        />
        <KpiCard
          label="Revenue Opportunity"
          value={formatInrCompact(summary.revenueInr)}
          sublabel={`${summary.leads} leads · ₹27.5L avg ticket`}
          delta={9.1}
          spark={spark(71, summary.revenueInr / 1e7, 0.4)}
          accent="healthy"
          icon={IndianRupee}
        />
      </div>

      {/* Insight row */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <HealthDonut summary={summary} />
        <ScoreHistogram summary={summary} />
      </div>

      {/* Units grid */}
      <div className="mt-4 flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Fleet Inventory</h2>
          <span className="text-[11px] text-muted-foreground">
            All connected elevators · sortable & searchable
          </span>
        </div>
      </div>

      <UnitsTable units={units} />
    </>
  );
}
