import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { generateFleet, scoreUnit, type CsvRow, type ScoredUnit } from "@/lib/fleet";
import { setThresholdOverrides, type ThresholdOverrides } from "@/lib/fleet";

export interface TelemetryPoint {
  t: number; // unix ms
  label: string; // formatted timestamp for x-axis
  Motor_Temp_C: number;
  Current_Draw_A: number;
  Vibration_RMS: number;
  Leveling_Accuracy_mm: number;
  Main_Rope_Condition: number;
}

export type TicketPriority = "Emergency" | "High" | "Routine";
export type TicketStatus = "Open" | "In-Progress" | "Resolved";

export interface ServiceTicket {
  id: string; // e.g. TK-0042
  unitId: string;
  site: string;
  city: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  summary: string;
  notes: string;
  createdAt: number;
  snapshot: {
    Motor_Temp_C: number;
    Vibration_RMS: number;
    Current_Draw_A: number;
    Door_Open_Close_MS: number;
    Main_Rope_Condition: number;
    Leveling_Accuracy_mm: number;
  };
}

interface FleetDataValue {
  units: ScoredUnit[];
  source: "mock" | "csv";
  fileName: string | null;
  setUnits: (units: ScoredUnit[], fileName: string, rawRows: CsvRow[]) => void;
  reset: () => void;
  getTimeseries: (unitId: string) => TelemetryPoint[];
  selectedUnitId: string | null;
  setSelectedUnitId: (id: string | null) => void;
  tickets: ServiceTicket[];
  addTicket: (ticket: ServiceTicket) => void;
  updateTicket: (id: string, patch: Partial<ServiceTicket>) => void;
  removeTicket: (id: string) => void;
  thresholds: ThresholdOverrides;
  setThresholds: (next: ThresholdOverrides) => void;
  averageTicketInr: number;
  setAverageTicketInr: (next: number) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const FleetDataContext = createContext<FleetDataValue | null>(null);

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

function fmtTs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const d = new Date(ms);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Synthesize a 48-point series for a mock unit so the inspector charts have
 * something realistic before a CSV is ingested. Deterministic per Unit_ID.
 */
function synthesizeSeries(unit: ScoredUnit): TelemetryPoint[] {
  let s = 0;
  for (const ch of unit.Unit_ID) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const now = Date.now();
  const points: TelemetryPoint[] = [];
  for (let i = 47; i >= 0; i--) {
    const t = now - i * 60 * 60 * 1000; // hourly
    const drift = (rand() - 0.5) * 0.15;
    const wave = Math.sin((47 - i) / 4) * 0.08;
    points.push({
      t,
      label: fmtTs(t),
      Motor_Temp_C: +(unit.Motor_Temp_C * (1 + drift + wave)).toFixed(2),
      Current_Draw_A: +(unit.Current_Draw_A * (1 + drift * 0.8 + wave * 0.6)).toFixed(2),
      Vibration_RMS: +(unit.Vibration_RMS * (1 + drift)).toFixed(4),
      Leveling_Accuracy_mm: +(unit.Leveling_Accuracy_mm * (1 + drift * 0.5)).toFixed(2),
      Main_Rope_Condition: +Math.max(
        90,
        Math.min(100, unit.Main_Rope_Condition + drift * 0.5),
      ).toFixed(2),
    });
  }
  return points;
}

// v2: schema renamed Bearing_Health_Index → Main_Rope_Condition.
const STORAGE_KEY = "fujitec-pulse:fleet-v2";
const TICKETS_KEY = "fujitec-pulse:tickets-v1";
const THRESHOLDS_KEY = "fujitec-pulse:thresholds-v1";
const THEME_KEY = "fujitec-pulse:theme-v1";
const COMMERCIAL_KEY = "fujitec-pulse:commercial-v1";
const DEFAULT_AVERAGE_TICKET_INR = 1_450_000;

const DEFAULT_THRESHOLDS: ThresholdOverrides = {
  ropeWarningBelow: 96,
  ropeCriticalBelow: 94,
};

function loadThresholds(): ThresholdOverrides {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(THRESHOLDS_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<ThresholdOverrides>;
    return {
      ropeWarningBelow: Number(parsed.ropeWarningBelow ?? DEFAULT_THRESHOLDS.ropeWarningBelow),
      ropeCriticalBelow: Number(parsed.ropeCriticalBelow ?? DEFAULT_THRESHOLDS.ropeCriticalBelow),
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

function loadTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function loadAverageTicketInr(): number {
  if (typeof window === "undefined") return DEFAULT_AVERAGE_TICKET_INR;
  try {
    const raw = window.localStorage.getItem(COMMERCIAL_KEY);
    if (!raw) return DEFAULT_AVERAGE_TICKET_INR;
    const parsed = JSON.parse(raw) as { averageTicketInr?: number };
    const value = Number(parsed.averageTicketInr);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_AVERAGE_TICKET_INR;
  } catch {
    return DEFAULT_AVERAGE_TICKET_INR;
  }
}

function loadTickets(): ServiceTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ServiceTicket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface PersistedState {
  source: "csv";
  fileName: string | null;
  units: ScoredUnit[];
  rawRows: CsvRow[];
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.units?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function FleetDataProvider({ children }: { children: ReactNode }) {
  // Apply persisted thresholds before generating any units so scoring matches.
  const initialThresholds = useMemo(() => {
    const t = loadThresholds();
    setThresholdOverrides(t);
    return t;
  }, []);
  const initial = useMemo(() => generateFleet(200, 7), []);
  const persisted = useMemo(() => loadPersisted(), []);
  const [units, setUnitsState] = useState<ScoredUnit[]>(persisted?.units ?? initial);
  const [source, setSource] = useState<"mock" | "csv">(persisted ? "csv" : "mock");
  const [fileName, setFileName] = useState<string | null>(persisted?.fileName ?? null);
  const [rawRows, setRawRows] = useState<CsvRow[]>(persisted?.rawRows ?? []);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<ServiceTicket[]>(() => loadTickets());
  const [thresholds, setThresholdsState] = useState<ThresholdOverrides>(initialThresholds);
  const [averageTicketInr, setAverageTicketInrState] = useState(() => loadAverageTicketInr());
  const [theme, setTheme] = useState<"dark" | "light">(() => loadTheme());

  // Apply theme to <html>.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Persist tickets whenever they change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
    } catch {
      // ignore quota errors
    }
  }, [tickets]);

  // Memoized series cache — recomputes when raw rows or units change.
  const seriesByUnit = useMemo(() => {
    const map = new Map<string, TelemetryPoint[]>();
    if (source === "csv" && rawRows.length) {
      for (const row of rawRows) {
        const id = String(row.Elevator_ID ?? "").trim();
        if (!id) continue;
        const ms = Date.parse(row.Timestamp ?? "");
        if (!Number.isFinite(ms)) continue;
        const arr = map.get(id) ?? [];
        arr.push({
          t: ms,
          label: fmtTs(ms),
          Motor_Temp_C: num(row.Motor_Temp_C),
          Current_Draw_A: num(row.Current_Draw_A),
          Vibration_RMS: num(row.Vibration_RMS),
          Leveling_Accuracy_mm: num(row.Leveling_Accuracy_mm),
          Main_Rope_Condition: num(row.Main_Rope_Condition),
        });
        map.set(id, arr);
      }
      for (const [, arr] of map) arr.sort((a, b) => a.t - b.t);
    }
    return map;
  }, [rawRows, source]);

  const value: FleetDataValue = {
    units,
    source,
    fileName,
    setUnits: (next, name, rows) => {
      setUnitsState(next);
      setSource("csv");
      setFileName(name);
      setRawRows(rows);
      try {
        if (typeof window !== "undefined") {
          const payload: PersistedState = {
            source: "csv",
            fileName: name,
            units: next,
            rawRows: rows,
          };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
      } catch {
        // Quota exceeded or serialization error — keep in-memory state regardless.
      }
    },
    reset: () => {
      setUnitsState(initial);
      setSource("mock");
      setFileName(null);
      setRawRows([]);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    },
    getTimeseries: (unitId: string) => {
      const csvSeries = seriesByUnit.get(unitId);
      if (csvSeries && csvSeries.length) return csvSeries;
      const unit = units.find((u) => u.Unit_ID === unitId);
      return unit ? synthesizeSeries(unit) : [];
    },
    selectedUnitId,
    setSelectedUnitId,
    tickets,
    addTicket: (ticket) => setTickets((cur) => [ticket, ...cur]),
    updateTicket: (id, patch) =>
      setTickets((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    removeTicket: (id) => setTickets((cur) => cur.filter((t) => t.id !== id)),
    thresholds,
    averageTicketInr,
    setAverageTicketInr: (next) => {
      setAverageTicketInrState(next);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(COMMERCIAL_KEY, JSON.stringify({ averageTicketInr: next }));
        }
      } catch {
        /* ignore */
      }
    },
    setThresholds: (next) => {
      setThresholdsState(next);
      setThresholdOverrides(next);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next));
        }
      } catch {
        /* ignore */
      }
      // Re-score current units using the new thresholds.
      setUnitsState((cur) => cur.map((u) => scoreUnit(u)));
    },
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };

  return <FleetDataContext.Provider value={value}>{children}</FleetDataContext.Provider>;
}

export function useFleetData(): FleetDataValue {
  const ctx = useContext(FleetDataContext);
  if (!ctx) throw new Error("useFleetData must be used inside <FleetDataProvider>");
  return ctx;
}
