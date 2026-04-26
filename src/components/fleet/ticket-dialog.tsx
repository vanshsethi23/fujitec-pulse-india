import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ScoredUnit } from "@/lib/fleet";
import {
  useFleetData,
  type ServiceTicket,
  type TicketPriority,
} from "@/components/fleet/fleet-data-context";

interface Props {
  unit: ScoredUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_META: Record<TicketPriority, { cls: string }> = {
  Emergency: { cls: "border-critical/40 bg-critical/15 text-critical" },
  High: { cls: "border-warning/40 bg-warning/15 text-warning" },
  Routine: { cls: "border-healthy/40 bg-healthy/15 text-healthy" },
};

export function deriveTicketIdFromUnit(unitId: string): string {
  // Pull trailing digits, fall back to a random 4-digit suffix.
  const m = unitId.match(/(\d+)\s*$/);
  if (m) return `TK-${m[1]}`;
  return `TK-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function derivePriority(unit: ScoredUnit): TicketPriority {
  if (unit.Main_Rope_Condition < 94) return "Emergency";
  if (unit.status === "warning" || unit.Main_Rope_Condition < 96) return "High";
  return "Routine";
}

function deriveSensorOfInterest(unit: ScoredUnit): string {
  // Pick the most degraded channel for the summary line.
  if (unit.Main_Rope_Condition < 96) return "Main Rope Condition";
  if (unit.Vibration_RMS > 0.15) return "Vibration RMS";
  if (unit.Motor_Temp_C > 60) return "Motor Temperature";
  if (unit.Current_Draw_A > 22) return "Current Draw";
  if (Math.abs(unit.Leveling_Accuracy_mm) > 4) return "Leveling Accuracy";
  return "Telemetry channels";
}

function buildNotes(unit: ScoredUnit): string {
  return [
    `Unit: ${unit.Unit_ID} — ${unit.Site}, ${unit.City}`,
    `Installed: ${unit.Install_Year} (${unit.age}y old)`,
    `Status: ${unit.status.toUpperCase()} · Mod. score ${unit.score.toFixed(2)}`,
    "",
    "Latest sensor readings:",
    `• Motor_Temp_C        : ${unit.Motor_Temp_C.toFixed(1)} °C`,
    `• Vibration_RMS       : ${unit.Vibration_RMS.toFixed(3)} g`,
    `• Current_Draw_A      : ${unit.Current_Draw_A.toFixed(1)} A`,
    `• Avg Door Cycle      : ${unit.Door_Open_Close_MS.toFixed(0)} ms`,
    `• Main_Rope_Condition : ${unit.Main_Rope_Condition.toFixed(1)} %`,
    `• Leveling_Accuracy   : ${unit.Leveling_Accuracy_mm.toFixed(2)} mm`,
  ].join("\n");
}

export function TicketDialog({ unit, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { addTicket } = useFleetData();

  const [ticketId, setTicketId] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("Routine");
  const [assignee, setAssignee] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");

  const sensor = useMemo(() => (unit ? deriveSensorOfInterest(unit) : ""), [unit]);

  // Re-prefill whenever the dialog opens for a unit.
  useEffect(() => {
    if (!open || !unit) return;
    setTicketId(deriveTicketIdFromUnit(unit.Unit_ID));
    setPriority(derivePriority(unit));
    setAssignee("");
    setSummary(`Anomalous reading in ${deriveSensorOfInterest(unit)} detected.`);
    setNotes(buildNotes(unit));
  }, [open, unit]);

  const handleSubmit = () => {
    if (!unit) return;
    const trimmedAssignee = assignee.trim();
    if (!trimmedAssignee) {
      toast.error("Please enter the assigned engineer's name.");
      return;
    }
    const ticket: ServiceTicket = {
      id: ticketId.trim() || deriveTicketIdFromUnit(unit.Unit_ID),
      unitId: unit.Unit_ID,
      site: unit.Site,
      city: unit.City,
      priority,
      status: "Open",
      assignee: trimmedAssignee,
      summary: summary.trim() || `Anomalous reading in ${sensor} detected.`,
      notes,
      createdAt: Date.now(),
      snapshot: {
        Motor_Temp_C: unit.Motor_Temp_C,
        Vibration_RMS: unit.Vibration_RMS,
        Current_Draw_A: unit.Current_Draw_A,
        Door_Open_Close_MS: unit.Door_Open_Close_MS,
        Main_Rope_Condition: unit.Main_Rope_Condition,
        Leveling_Accuracy_mm: unit.Leveling_Accuracy_mm,
      },
    };
    addTicket(ticket);
    toast.success(`Ticket ${ticket.id} issued`, {
      description: `${unit.Unit_ID} → ${trimmedAssignee} · ${priority}`,
    });
    onOpenChange(false);
    navigate({ to: "/tickets" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/40 bg-brand/10 text-brand">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            New Service Ticket
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Pre-filled from the active unit's latest telemetry. Review and
            issue to dispatch the assigned field engineer.
          </DialogDescription>
        </DialogHeader>

        {!unit ? (
          <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
            <AlertTriangle className="h-4 w-4" />
            Select a unit first to issue a ticket.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Ticket ID">
                <Input
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label="Priority">
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TicketPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Assigned Engineer *">
                <Input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Enter engineer name"
                  required
                />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("rounded-sm font-mono text-[11px]", PRIORITY_META[priority].cls)}
              >
                {priority}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                Auto-derived from rope condition & status
              </span>
            </div>

            <Field label="Issue Summary">
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Field>

            <Field label="Technical Notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={9}
                className="font-mono text-[11px] leading-relaxed"
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!unit}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Wrench className="mr-1.5 h-3.5 w-3.5" />
            Issue Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
