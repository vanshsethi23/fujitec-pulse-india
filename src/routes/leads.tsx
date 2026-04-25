import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, IndianRupee, Search, Sparkles, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatInrCompact,
  isModernizationLead,
  leadReasons,
  THRESHOLDS,
  type ScoredUnit,
} from "@/lib/fleet";
import { useFleetData } from "@/components/fleet/fleet-data-context";
import { ProposalDialog } from "@/components/fleet/proposal-dialog";


export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Modernization Leads — Fujitec Pulse" },
      {
        name: "description",
        content:
          "Ranked sales pipeline of Fujitec elevators eligible for modernization, derived from live telemetry and asset age.",
      },
      { property: "og:title", content: "Modernization Leads — Fujitec Pulse" },
      {
        property: "og:description",
        content: "Telemetry-driven ranked pipeline for elevator modernization.",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  return (
    <AppShell crumb="Modernization Leads">
      <LeadsBody />
    </AppShell>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const color =
    score >= 0.75 ? "var(--critical)" : score >= 0.5 ? "var(--warning)" : "var(--healthy)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${score * 100}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[12px] tabular-nums text-foreground">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function ReasonChips({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0)
    return <span className="text-[11px] text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {reasons.map((r, i) => (
        <span
          key={r}
          className={cn(
            "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
            i === 0
              ? "border-critical/30 bg-critical/10 text-critical"
              : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function LeadsBody() {
  const navigate = useNavigate();
  const { units, source, fileName, setSelectedUnitId } = useFleetData();
  const [query, setQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [proposalUnit, setProposalUnit] = useState<ScoredUnit | null>(null);

  const openInspector = (unitId: string) => {
    setSelectedUnitId(unitId);
    void navigate({ to: "/inspector" });
  };

  const leads = useMemo(() => units.filter(isModernizationLead), [units]);

  const enriched = useMemo(
    () => leads.map((u) => ({ unit: u, reasons: leadReasons(u) })),
    [leads],
  );

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = enriched.filter(({ unit }) => {
      if (!q) return true;
      return (
        unit.Unit_ID.toLowerCase().includes(q) ||
        unit.Site.toLowerCase().includes(q) ||
        unit.City.toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) =>
      sortDesc ? b.unit.score - a.unit.score : a.unit.score - b.unit.score,
    );
    return rows;
  }, [enriched, query, sortDesc]);

  const revenue = leads.length * THRESHOLDS.ticketInr;
  const avgScore = leads.length
    ? leads.reduce((s, u) => s + u.score, 0) / leads.length
    : 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Modernization Leads
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Ranked sales pipeline derived from telemetry · {leads.length} of {units.length}{" "}
            units qualify ·{" "}
            <span className="font-mono text-foreground">
              {source === "csv" ? `CSV — ${fileName}` : "Archetype dataset"}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-border bg-surface text-[12px] text-foreground"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export pipeline
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Target}
          label="Qualified Leads"
          value={leads.length.toString()}
          accent="warning"
          sub="Pre-2011 install OR Main Rope Condition < 96%"
        />
        <SummaryCard
          icon={IndianRupee}
          label="Revenue Opportunity"
          value={formatInrCompact(revenue)}
          accent="healthy"
          sub={`${leads.length} × ₹27.5L avg ticket`}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Avg Modernization Score"
          value={avgScore.toFixed(2)}
          accent="critical"
          sub="0.40·RopeRisk + 0.20·Vib + 0.20·LvlErr + 0.10·Cur + 0.10·Age"
        />
      </div>

      {/* Pipeline table */}
      <div className="mt-5 rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Unit ID, site, city…"
              className="h-9 w-[280px] border-border bg-surface pl-8 text-[13px]"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDesc((s) => !s)}
            className="h-9 border-border bg-surface text-[12px] text-foreground"
          >
            {sortDesc ? (
              <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
            )}
            Score: {sortDesc ? "Highest first" : "Lowest first"}
          </Button>

          <div className="ml-auto text-[11px] text-muted-foreground">
            <span className="font-mono text-foreground">{filteredSorted.length}</span> shown
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12 text-[11px] uppercase tracking-[0.1em]">
                  Rank
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                  Unit ID
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                  Site / Location
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                  Install
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">Age</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                  Vibration
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                  Main Rope Condition (%)
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-[11px] uppercase tracking-[0.1em] hover:text-foreground"
                  onClick={() => setSortDesc((s) => !s)}
                >
                  Modernization Score{" "}
                  {sortDesc ? (
                    <ArrowDown className="ml-1 inline h-3 w-3" />
                  ) : (
                    <ArrowUp className="ml-1 inline h-3 w-3" />
                  )}
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.1em]">Reason</TableHead>
                <TableHead className="w-[180px] text-right text-[11px] uppercase tracking-[0.1em]">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSorted.map(({ unit, reasons }, idx) => (
                <LeadRow
                  key={unit.Unit_ID}
                  rank={idx + 1}
                  unit={unit}
                  reasons={reasons}
                  onSelect={() => openInspector(unit.Unit_ID)}
                  onProposal={() => setProposalUnit(unit)}
                />
              ))}
              {filteredSorted.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No leads match — fleet is in great shape, or refine the search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProposalDialog
        unit={proposalUnit}
        open={proposalUnit !== null}
        onOpenChange={(o) => !o && setProposalUnit(null)}
      />
    </>
  );
}

function LeadRow({
  rank,
  unit,
  reasons,
  onSelect,
  onProposal,
}: {
  rank: number;
  unit: ScoredUnit;
  reasons: string[];
  onSelect: () => void;
  onProposal: () => void;
}) {
  return (
    <TableRow
      onClick={onSelect}
      className="cursor-pointer border-border hover:bg-accent/40"
    >
      <TableCell>
        <Badge
          variant="outline"
          className="font-mono text-[11px] tabular-nums border-border bg-surface text-muted-foreground"
        >
          #{rank}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-[12px] text-foreground">{unit.Unit_ID}</TableCell>
      <TableCell>
        <div className="text-[13px] text-foreground">{unit.Site}</div>
        <div className="text-[11px] text-muted-foreground">{unit.City}</div>
      </TableCell>
      <TableCell className="font-mono text-[12px] text-muted-foreground">
        {unit.Install_Year}
      </TableCell>
      <TableCell className="font-mono text-[12px] text-foreground">{unit.age}y</TableCell>
      <TableCell className="font-mono text-[12px] text-foreground">
        {unit.Vibration_RMS.toFixed(3)}
        <span className="ml-1 text-[10px] text-muted-foreground">g</span>
      </TableCell>
      <TableCell className="font-mono text-[12px] text-foreground">
        {unit.Main_Rope_Condition.toFixed(1)}
        <span className="ml-1 text-[10px] text-muted-foreground">%</span>
      </TableCell>
      <TableCell>
        <ScoreMeter score={unit.score} />
      </TableCell>
      <TableCell>
        <ReasonChips reasons={reasons} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onProposal();
          }}
          className="h-8 border-primary/30 bg-primary/5 text-[11px] font-medium text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Generate Proposal
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: "warning" | "healthy" | "critical";
}) {
  const accentCls =
    accent === "warning"
      ? "text-warning bg-warning/10 border-warning/30"
      : accent === "healthy"
        ? "text-healthy bg-healthy/10 border-healthy/30"
        : "text-critical bg-critical/10 border-critical/30";
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
      <div className="mt-2 font-mono text-[26px] font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
