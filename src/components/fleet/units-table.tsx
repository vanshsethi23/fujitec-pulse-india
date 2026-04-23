import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { UnitDetailSheet } from "@/components/fleet/unit-detail-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScoredUnit, UnitStatus } from "@/lib/fleet";

const STATUS_META: Record<UnitStatus, { label: string; cls: string; dot: string }> = {
  healthy: {
    label: "Healthy",
    cls: "border-healthy/30 bg-healthy/10 text-healthy",
    dot: "bg-healthy shadow-[0_0_6px_var(--healthy)]",
  },
  warning: {
    label: "Warning",
    cls: "border-warning/30 bg-warning/10 text-warning",
    dot: "bg-warning shadow-[0_0_6px_var(--warning)]",
  },
  critical: {
    label: "Critical",
    cls: "border-critical/30 bg-critical/10 text-critical",
    dot: "bg-critical shadow-[0_0_6px_var(--critical)]",
  },
};

function ScoreMeter({ score, status }: { score: number; status: UnitStatus }) {
  const color =
    status === "critical"
      ? "var(--critical)"
      : status === "warning"
        ? "var(--warning)"
        : "var(--healthy)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
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

const FILTERS: ("all" | UnitStatus)[] = ["all", "healthy", "warning", "critical"];

export function UnitsTable({ units }: { units: ScoredUnit[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | UnitStatus>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = units.filter((u) => {
      if (filter !== "all" && u.status !== filter) return false;
      if (!q) return true;
      return (
        u.Unit_ID.toLowerCase().includes(q) ||
        u.Site.toLowerCase().includes(q) ||
        u.City.toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
    return rows;
  }, [units, query, filter, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <>
    <div className="rounded-md border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search Unit ID, site, city…"
            className="h-9 w-[280px] border-border bg-surface pl-8 text-[13px]"
          />
        </div>

        <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={cn(
                "rounded-[4px] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors",
                filter === f
                  ? "bg-brand/15 text-brand"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : STATUS_META[f].label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDesc((s) => !s)}
          className="h-9 border-border bg-surface text-[12px] text-foreground"
        >
          Score: {sortDesc ? "High → Low" : "Low → High"}
        </Button>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground">{filtered.length}</span> of{" "}
          <span className="font-mono">{units.length}</span> units
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">Unit ID</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                Site / Location
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">Install</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">Age</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                Vibration RMS
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                Bearing Health
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">
                Modernization Score
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em]">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((u) => {
              const s = STATUS_META[u.status];
              return (
                <TableRow
                  key={u.Unit_ID}
                  onClick={() => setActiveUnitId(u.Unit_ID)}
                  className="group cursor-pointer border-border hover:bg-accent/40"
                >
                  <TableCell className="font-mono text-[12px] text-foreground">
                    {u.Unit_ID}
                  </TableCell>
                  <TableCell>
                    <div className="text-[13px] text-foreground">{u.Site}</div>
                    <div className="text-[11px] text-muted-foreground">{u.City}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">
                    {u.Install_Year}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-foreground">
                    {u.age}y
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-foreground">
                    {u.Vibration_RMS.toFixed(3)}
                    <span className="ml-1 text-[10px] text-muted-foreground">g</span>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-foreground">
                    {u.Bearing_Health_Index.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <ScoreMeter score={u.score} status={u.status} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
                        s.cls,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                      {s.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No units match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border p-3 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[72px] border-border bg-surface text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span>
            Page <span className="font-mono text-foreground">{safePage}</span> of{" "}
            <span className="font-mono">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              className="h-8 border-border bg-surface text-[12px]"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              className="h-8 border-border bg-surface text-[12px]"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
    <UnitDetailSheet
      unitId={activeUnitId}
      open={activeUnitId !== null}
      onOpenChange={(o) => !o && setActiveUnitId(null)}
    />
    </>
  );
}
