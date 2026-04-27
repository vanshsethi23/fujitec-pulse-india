import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { generateFleet, scoreUnit, type CsvRow, type ScoredUnit } from "@/lib/fleet";
import { setThresholdOverrides, type ThresholdOverrides } from "@/lib/fleet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/auth-context";

export interface TelemetryPoint {
  t: number;
  label: string;
  Motor_Temp_C: number;
  Current_Draw_A: number;
  Vibration_RMS: number;
  Leveling_Accuracy_mm: number;
  Main_Rope_Condition: number;
}

export type TicketPriority = "Emergency" | "High" | "Routine";
export type TicketStatus = "Open" | "In-Progress" | "Resolved";

export interface ServiceTicket {
  id: string;
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
  setUnits: (units: ScoredUnit[], fileName: string, rawRows: CsvRow[]) => Promise<void>;
  reset: () => void;
  clearLocalState: () => void;
  getTimeseries: (unitId: string) => TelemetryPoint[];
  selectedUnitId: string | null;
  setSelectedUnitId: (id: string | null) => void;
  tickets: ServiceTicket[];
  addTicket: (ticket: ServiceTicket) => Promise<void>;
  updateTicket: (id: string, patch: Partial<ServiceTicket>) => void;
  removeTicket: (id: string) => void;
  thresholds: ThresholdOverrides;
  setThresholds: (next: ThresholdOverrides) => void;
  averageTicketInr: number;
  setAverageTicketInr: (next: number) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  cloudReady: boolean;
}

const FleetDataContext = createContext<FleetDataValue | null>(null);
const db = supabase as any;

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

function fmtTs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

function synthesizeSeries(unit: ScoredUnit): TelemetryPoint[] {
  let s = 0;
  for (const ch of unit.Unit_ID) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const now = Date.now();
  const points: TelemetryPoint[] = [];
  for (let i = 719; i >= 0; i--) {
    const t = now - i * 60 * 60 * 1000;
    const drift = (rand() - 0.5) * 0.15;
    const wave = Math.sin((719 - i) / 24) * 0.08;
    points.push({
      t,
      label: fmtTs(t),
      Motor_Temp_C: +(unit.Motor_Temp_C * (1 + drift + wave)).toFixed(2),
      Current_Draw_A: +(unit.Current_Draw_A * (1 + drift * 0.8 + wave * 0.6)).toFixed(2),
      Vibration_RMS: +(unit.Vibration_RMS * (1 + drift)).toFixed(4),
      Leveling_Accuracy_mm: +(unit.Leveling_Accuracy_mm * (1 + drift * 0.5)).toFixed(2),
      Main_Rope_Condition: +Math.max(90, Math.min(100, unit.Main_Rope_Condition + drift * 0.5)).toFixed(2),
    });
  }
  return points;
}

const STORAGE_KEY = "fujitec-pulse:fleet-v2";
const THEME_KEY = "fujitec-pulse:theme-v1";
const DEFAULT_AVERAGE_TICKET_INR = 1_450_000;
const DEFAULT_THRESHOLDS: ThresholdOverrides = { ropeWarningBelow: 96, ropeCriticalBelow: 94 };
const DB_BATCH_SIZE = 500;

function loadTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try { return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

function readLegacyFleet(): { units: ScoredUnit[]; rawRows: CsvRow[]; fileName: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { units?: ScoredUnit[]; rawRows?: CsvRow[]; fileName?: string | null };
    if (!parsed.units?.length) return null;
    return { units: parsed.units, rawRows: parsed.rawRows ?? [], fileName: parsed.fileName ?? "Imported CSV" };
  } catch { return null; }
}

function unitToDb(userId: string, unit: ScoredUnit) {
  return {
    user_id: userId,
    unit_id: unit.Unit_ID,
    customer_name: null,
    location: unit.Site,
    region: unit.City,
    install_year: unit.Install_Year,
    door_cycles: Math.round(unit.Door_Cycles_Hour),
    trips_per_day: null,
    main_rope_condition: unit.Main_Rope_Condition,
    vibration_mm_s: unit.Vibration_RMS,
    brake_wear: null,
    callbacks_90d: null,
    downtime_hours_90d: null,
    health_score: Math.round((1 - unit.score) * 100),
    lead_status: unit.isLead ? "qualified" : "not_qualified",
    source_row: unit,
  };
}

function dbToUnit(row: any): ScoredUnit {
  return scoreUnit({
    Unit_ID: row.unit_id,
    Site: row.location ?? "Imported Site",
    City: row.region ?? "—",
    Install_Year: Number(row.install_year ?? 2021),
    Motor_Temp_C: Number(row.source_row?.Motor_Temp_C ?? 0),
    Vibration_RMS: Number(row.vibration_mm_s ?? row.source_row?.Vibration_RMS ?? 0),
    Current_Draw_A: Number(row.source_row?.Current_Draw_A ?? 0),
    Leveling_Accuracy_mm: Number(row.source_row?.Leveling_Accuracy_mm ?? 0),
    Door_Cycles_Hour: Number(row.source_row?.Door_Cycles_Hour ?? row.door_cycles ?? 0),
    Door_Open_Close_MS: Number(row.source_row?.Door_Open_Close_MS ?? 0),
    Main_Rope_Condition: Number(row.main_rope_condition ?? 100),
  });
}

function rowToTelemetryDb(userId: string, row: CsvRow) {
  const ms = Date.parse(row.Timestamp ?? "");
  return {
    user_id: userId,
    elevator_id: String(row.Elevator_ID ?? "").trim(),
    timestamp_text: row.Timestamp ?? null,
    recorded_at: Number.isFinite(ms) ? new Date(ms).toISOString() : null,
    install_year: num(row.Install_Year),
    motor_temp_c: num(row.Motor_Temp_C),
    vibration_rms: num(row.Vibration_RMS),
    current_draw_a: num(row.Current_Draw_A),
    leveling_accuracy_mm: num(row.Leveling_Accuracy_mm),
    door_cycles_hour: num(row.Door_Cycles_Hour),
    door_open_close_ms: num(row.Door_Open_Close_MS),
    main_rope_condition: num(row.Main_Rope_Condition),
    target_state: row.Target_State ?? null,
    source_row: row,
  };
}

async function expectOk<T extends { error?: { message: string } | null }>(promise: PromiseLike<T>, label: string): Promise<T> {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result;
}

async function insertInBatches(table: "fleet_units" | "fleet_telemetry_rows", records: any[], label: string) {
  for (let i = 0; i < records.length; i += DB_BATCH_SIZE) {
    await expectOk(db.from(table).insert(records.slice(i, i + DB_BATCH_SIZE)), label);
  }
}

async function persistFleetDataset(userId: string, next: ScoredUnit[], name: string, rows: CsvRow[]) {
  const telemetry = rows.filter((r) => String(r.Elevator_ID ?? "").trim()).map((r) => rowToTelemetryDb(userId, r));
  await Promise.all([
    expectOk(db.from("fleet_units").delete().eq("user_id", userId), "Clear saved units"),
    expectOk(db.from("fleet_telemetry_rows").delete().eq("user_id", userId), "Clear saved telemetry"),
  ]);
  await insertInBatches("fleet_units", next.map((u) => unitToDb(userId, u)), "Save fleet units");
  await insertInBatches("fleet_telemetry_rows", telemetry, "Save telemetry rows");
  await expectOk(
    db.from("fleet_settings").upsert({ user_id: userId, active_dataset_name: name }, { onConflict: "user_id" }),
    "Save active dataset name",
  );
}

function parseTicketPayload(description: string | null) {
  if (!description) return {};
  try {
    return JSON.parse(description);
  } catch {
    return { notes: description };
  }
}

function dbToTicket(row: any): ServiceTicket {
  const payload = parseTicketPayload(row.description);
  return {
    id: row.ticket_code ?? row.id,
    unitId: row.unit_id ?? payload.unitId ?? "",
    site: payload.site ?? "Imported Site",
    city: payload.city ?? "—",
    priority: row.priority,
    status: row.status,
    assignee: row.owner ?? "Unassigned",
    summary: row.title,
    notes: payload.notes ?? "",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    snapshot: payload.snapshot ?? { Motor_Temp_C: 0, Vibration_RMS: 0, Current_Draw_A: 0, Door_Open_Close_MS: 0, Main_Rope_Condition: 0, Leveling_Accuracy_mm: 0 },
  };
}

function ticketToDb(userId: string, ticket: ServiceTicket) {
  return {
    user_id: userId,
    ticket_code: ticket.id,
    unit_id: ticket.unitId,
    title: ticket.summary,
    priority: ticket.priority,
    status: ticket.status,
    owner: ticket.assignee,
    description: JSON.stringify({ site: ticket.site, city: ticket.city, notes: ticket.notes, snapshot: ticket.snapshot, unitId: ticket.unitId }),
  };
}

export function FleetDataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const initial = useMemo(() => generateFleet(200, 7), []);
  const [units, setUnitsState] = useState<ScoredUnit[]>(initial);
  const [source, setSource] = useState<"mock" | "csv">("mock");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<CsvRow[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [thresholds, setThresholdsState] = useState<ThresholdOverrides>(DEFAULT_THRESHOLDS);
  const [averageTicketInr, setAverageTicketInrState] = useState(DEFAULT_AVERAGE_TICKET_INR);
  const [theme, setTheme] = useState<"dark" | "light">(() => loadTheme());
  const [cloudReady, setCloudReady] = useState(false);

  const clearLocalState = () => {
    setUnitsState(initial);
    setSource("mock");
    setFileName(null);
    setRawRows([]);
    setSelectedUnitId(null);
    setTickets([]);
    setThresholdsState(DEFAULT_THRESHOLDS);
    setThresholdOverrides(DEFAULT_THRESHOLDS);
    setAverageTicketInrState(DEFAULT_AVERAGE_TICKET_INR);
    setCloudReady(false);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", theme === "light");
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let alive = true;
    setCloudReady(false);
    void (async () => {
      const [{ data: settings }, { data: unitRows }, { data: ticketRows }] = await Promise.all([
        db.from("fleet_settings").select("rope_replacement_trigger, critical_shutdown_limit, average_ticket_inr").eq("user_id", user.id).maybeSingle(),
        db.from("fleet_units").select("*").eq("user_id", user.id).order("unit_id", { ascending: true }),
        db.from("service_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      const telemetryRows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await db
          .from("fleet_telemetry_rows")
          .select("source_row")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: true })
          .range(from, from + 999);
        if (!Array.isArray(data) || data.length === 0) break;
        telemetryRows.push(...data);
        if (data.length < 1000) break;
      }
      if (!alive) return;
      const nextThresholds = {
        ropeWarningBelow: Number(settings?.rope_replacement_trigger ?? DEFAULT_THRESHOLDS.ropeWarningBelow),
        ropeCriticalBelow: Number(settings?.critical_shutdown_limit ?? DEFAULT_THRESHOLDS.ropeCriticalBelow),
      };
      setThresholdOverrides(nextThresholds);
      setThresholdsState(nextThresholds);
      setAverageTicketInrState(Number(settings?.average_ticket_inr ?? DEFAULT_AVERAGE_TICKET_INR));
      setTickets(Array.isArray(ticketRows) ? ticketRows.map(dbToTicket) : []);
      setRawRows(Array.isArray(telemetryRows) ? telemetryRows.map((r: any) => r.source_row as CsvRow) : []);
      if (Array.isArray(unitRows) && unitRows.length) {
        setUnitsState(unitRows.map(dbToUnit));
        setSource("csv");
        setFileName("Cloud Database");
      } else {
        const legacy = readLegacyFleet();
        if (legacy) {
          setUnitsState(legacy.units);
          setRawRows(legacy.rawRows);
          setFileName(legacy.fileName);
          setSource("csv");
          await db.from("fleet_units").upsert(legacy.units.map((u) => unitToDb(user.id, u)), { onConflict: "user_id,unit_id" });
          if (legacy.rawRows.length) await db.from("fleet_telemetry_rows").insert(legacy.rawRows.filter((r) => r.Elevator_ID).map((r) => rowToTelemetryDb(user.id, r)));
          window.localStorage.removeItem(STORAGE_KEY);
        } else {
          setUnitsState(initial);
          setSource("mock");
          setFileName(null);
        }
      }
      setCloudReady(true);
    })();
    return () => { alive = false; };
  }, [initial, isAuthenticated, user]);

  const seriesByUnit = useMemo(() => {
    const map = new Map<string, TelemetryPoint[]>();
    if (source === "csv" && rawRows.length) {
      for (const row of rawRows) {
        const id = String(row.Elevator_ID ?? "").trim();
        if (!id) continue;
        const ms = Date.parse(row.Timestamp ?? "");
        if (!Number.isFinite(ms)) continue;
        const arr = map.get(id) ?? [];
        arr.push({ t: ms, label: fmtTs(ms), Motor_Temp_C: num(row.Motor_Temp_C), Current_Draw_A: num(row.Current_Draw_A), Vibration_RMS: num(row.Vibration_RMS), Leveling_Accuracy_mm: num(row.Leveling_Accuracy_mm), Main_Rope_Condition: num(row.Main_Rope_Condition) });
        map.set(id, arr);
      }
      for (const [, arr] of map) arr.sort((a, b) => a.t - b.t);
    }
    return map;
  }, [rawRows, source]);

  const value: FleetDataValue = {
    units, source, fileName,
    setUnits: (next, name, rows) => {
      setUnitsState(next); setSource("csv"); setFileName(name); setRawRows(rows);
      if (user) void (async () => {
        await Promise.all([
          db.from("fleet_units").delete().eq("user_id", user.id),
          db.from("fleet_telemetry_rows").delete().eq("user_id", user.id),
        ]);
        await db.from("fleet_units").insert(next.map((u) => unitToDb(user.id, u)));
        const telemetry = rows.filter((r) => r.Elevator_ID).map((r) => rowToTelemetryDb(user.id, r));
        for (let i = 0; i < telemetry.length; i += 1000) await db.from("fleet_telemetry_rows").insert(telemetry.slice(i, i + 1000));
      })();
    },
    reset: () => {
      setUnitsState(initial); setSource("mock"); setFileName(null); setRawRows([]); setTickets([]);
      if (user) void Promise.all([
        db.from("fleet_units").delete().eq("user_id", user.id),
        db.from("fleet_telemetry_rows").delete().eq("user_id", user.id),
        db.from("service_tickets").delete().eq("user_id", user.id),
      ]);
      try { if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    },
    clearLocalState,
    getTimeseries: (unitId) => seriesByUnit.get(unitId) ?? (units.find((u) => u.Unit_ID === unitId) ? synthesizeSeries(units.find((u) => u.Unit_ID === unitId)!) : []),
    selectedUnitId, setSelectedUnitId, tickets,
    addTicket: (ticket) => {
      setTickets((cur) => [ticket, ...cur]);
      if (user) void db.from("service_tickets").upsert(ticketToDb(user.id, ticket));
    },
    updateTicket: (id, patch) => {
      setTickets((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (user) {
        const next = tickets.find((t) => t.id === id);
        if (next) void db.from("service_tickets").upsert(ticketToDb(user.id, { ...next, ...patch }));
      }
    },
    removeTicket: (id) => {
      setTickets((cur) => cur.filter((t) => t.id !== id));
      if (user) void db.from("service_tickets").delete().eq("user_id", user.id).eq("id", id);
    },
    thresholds,
    averageTicketInr,
    setAverageTicketInr: (next) => {
      setAverageTicketInrState(next);
      if (user) void db.from("fleet_settings").upsert({ user_id: user.id, average_ticket_inr: next }, { onConflict: "user_id" });
    },
    setThresholds: (next) => {
      setThresholdsState(next); setThresholdOverrides(next); setUnitsState((cur) => cur.map((u) => scoreUnit(u)));
      if (user) void db.from("fleet_settings").upsert({ user_id: user.id, rope_replacement_trigger: next.ropeWarningBelow, critical_shutdown_limit: next.ropeCriticalBelow }, { onConflict: "user_id" });
    },
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    cloudReady,
  };

  return <FleetDataContext.Provider value={value}>{children}</FleetDataContext.Provider>;
}

export function useFleetData(): FleetDataValue {
  const ctx = useContext(FleetDataContext);
  if (!ctx) throw new Error("useFleetData must be used inside <FleetDataProvider>");
  return ctx;
}
