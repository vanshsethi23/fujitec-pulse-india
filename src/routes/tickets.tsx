import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Inbox,
  MoreHorizontal,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useFleetData,
  type ServiceTicket,
  type TicketPriority,
  type TicketStatus,
} from "@/components/fleet/fleet-data-context";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Service Tickets — Fujitec Pulse" },
      {
        name: "description",
        content:
          "Field service Kanban for active modernization and emergency tickets across the fleet.",
      },
      { property: "og:title", content: "Service Tickets — Fujitec Pulse" },
      {
        property: "og:description",
        content:
          "Triage, assign, and resolve elevator service tickets with priority filtering and inline editing.",
      },
    ],
  }),
  component: TicketsPage,
});

const PRIORITY_META: Record<TicketPriority, { cls: string; dot: string }> = {
  Emergency: {
    cls: "border-critical/40 bg-critical/15 text-critical",
    dot: "bg-critical shadow-[0_0_8px_var(--critical)]",
  },
  High: {
    cls: "border-warning/40 bg-warning/15 text-warning",
    dot: "bg-warning shadow-[0_0_8px_var(--warning)]",
  },
  Routine: {
    cls: "border-healthy/40 bg-healthy/15 text-healthy",
    dot: "bg-healthy shadow-[0_0_8px_var(--healthy)]",
  },
};

const STATUSES: TicketStatus[] = ["Open", "In-Progress", "Resolved"];

const STATUS_META: Record<TicketStatus, { cls: string; label: string }> = {
  Open: { cls: "border-brand/40 bg-brand/10 text-brand", label: "Open" },
  "In-Progress": {
    cls: "border-warning/40 bg-warning/10 text-warning",
    label: "In Progress",
  },
  Resolved: {
    cls: "border-healthy/40 bg-healthy/10 text-healthy",
    label: "Resolved",
  },
};

function TicketsPage() {
  return (
    <AppShell crumb="Service Tickets">
      <TicketsBody />
    </AppShell>
  );
}

function TicketsBody() {
  const { tickets } = useFleetData();
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.unitId.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q)
      );
    });
  }, [tickets, priorityFilter, search]);

  const counts = useMemo(() => {
    const c: Record<TicketPriority, number> = { Emergency: 0, High: 0, Routine: 0 };
    for (const t of tickets) c[t.priority]++;
    return c;
  }, [tickets]);

  const byStatus: Record<TicketStatus, ServiceTicket[]> = {
    Open: [],
    "In-Progress": [],
    Resolved: [],
  };
  for (const t of filtered) byStatus[t.status].push(t);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Service Tickets
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Field service queue · {tickets.length} total ·{" "}
            <span className="text-critical">{counts.Emergency} emergency</span> ·{" "}
            <span className="text-warning">{counts.High} high</span> ·{" "}
            <span className="text-healthy">{counts.Routine} routine</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search ticket, unit, engineer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-[240px] bg-surface text-[12px]"
          />
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as "all" | TicketPriority)}
          >
            <SelectTrigger className="h-10 w-[180px] bg-surface text-[12px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Routine">Routine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyTickets />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} tickets={byStatus[status]} />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyTickets() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 px-6 py-20 text-center">
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand">
        <Inbox className="h-7 w-7" />
      </span>
      <h2 className="text-[16px] font-semibold text-foreground">
        No active service tickets
      </h2>
      <p className="mt-2 max-w-md text-[12px] text-muted-foreground">
        Issue a ticket from the Unit Inspector — it will appear here instantly,
        with priority auto-derived from the unit's rope condition and status.
      </p>
    </div>
  );
}

function KanbanColumn({
  status,
  tickets,
}: {
  status: TicketStatus;
  tickets: ServiceTicket[];
}) {
  const meta = STATUS_META[status];
  return (
    <section className="flex flex-col rounded-md border border-border bg-card/40">
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
              meta.cls,
            )}
          >
            {meta.label}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {tickets.length}
          </span>
        </div>
      </header>
      <div className="flex flex-col gap-2 p-2">
        {tickets.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-surface/30 px-3 py-6 text-center text-[11px] text-muted-foreground">
            No tickets in this column.
          </div>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} />)
        )}
      </div>
    </section>
  );
}

function TicketCard({ ticket }: { ticket: ServiceTicket }) {
  const { updateTicket, removeTicket, setSelectedUnitId } = useFleetData();
  const navigate = useNavigate();
  const meta = PRIORITY_META[ticket.priority];

  const created = new Date(ticket.createdAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const openUnit = () => {
    setSelectedUnitId(ticket.unitId);
    navigate({ to: "/inspector" });
  };

  return (
    <article className="group rounded-md border border-border bg-card p-3 shadow-sm transition hover:border-brand/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                meta.cls,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              {ticket.priority}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {ticket.id}
            </span>
          </div>
          <button
            onClick={openUnit}
            className="mt-1.5 inline-flex items-center gap-1 font-mono text-[14px] font-semibold text-foreground hover:text-brand"
          >
            {ticket.unitId}
            <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
          </button>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {ticket.site} · {ticket.city}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={openUnit}>
              <Wrench className="mr-2 h-3.5 w-3.5" /> Open in Inspector
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-critical focus:text-critical"
              onClick={() => {
                removeTicket(ticket.id);
                toast.success(`Ticket ${ticket.id} removed`);
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete ticket
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-foreground/85">
        {ticket.summary}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InlineField label="Status">
          <Select
            value={ticket.status}
            onValueChange={(v) =>
              updateTicket(ticket.id, { status: v as TicketStatus })
            }
          >
            <SelectTrigger className="h-7 bg-surface text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-[11px]">
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InlineField>
        <InlineField label="Priority">
          <Select
            value={ticket.priority}
            onValueChange={(v) =>
              updateTicket(ticket.id, { priority: v as TicketPriority })
            }
          >
            <SelectTrigger className="h-7 bg-surface text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Emergency" className="text-[11px]">
                Emergency
              </SelectItem>
              <SelectItem value="High" className="text-[11px]">
                High
              </SelectItem>
              <SelectItem value="Routine" className="text-[11px]">
                Routine
              </SelectItem>
            </SelectContent>
          </Select>
        </InlineField>
      </div>

      <div className="mt-2">
        <InlineField label="Engineer">
          <Select
            value={ticket.assignee}
            onValueChange={(v) => updateTicket(ticket.id, { assignee: v })}
          >
            <SelectTrigger className="h-7 bg-surface text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGINEERS.map((e) => (
                <SelectItem key={e} value={e} className="text-[11px]">
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InlineField>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <User className="h-3 w-3" />
          {ticket.assignee}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {created}
        </span>
      </div>

      {ticket.priority === "Emergency" && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-critical/30 bg-critical/10 p-2 text-[10px] text-critical">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Rope condition {ticket.snapshot.Main_Rope_Condition.toFixed(1)}% — below
          94% safety threshold.
        </div>
      )}
    </article>
  );
}

function InlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
