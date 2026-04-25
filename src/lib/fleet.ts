// Fujitec Pulse — fleet domain module.
// Owns the elevator schema (matching the eventual CSV), the mock generator,
// the Modernization Score formula, and status thresholds. When the real CSV
// arrives, replace `generateFleet` with a parser — UI stays untouched.

export interface ElevatorUnit {
  Unit_ID: string;
  Site: string;
  City: string;
  Install_Year: number;
  Motor_Temp_C: number;
  Vibration_RMS: number;
  Current_Draw_A: number;
  Leveling_Accuracy_mm: number;
  Door_Cycles_Hour: number;
  Door_Open_Close_MS: number;
  Main_Rope_Condition: number; // 0..100 % — higher is healthier (replacement at 94%)
}

export interface ScoredUnit extends ElevatorUnit {
  age: number;
  score: number; // 0..1 modernization score
  status: UnitStatus;
  isLead: boolean;
}

export type UnitStatus = "healthy" | "warning" | "critical";

// Centralized thresholds — tune once when real data lands.
export const THRESHOLDS = {
  criticalScore: 0.75,
  warningScore: 0.5,
  // Main rope thickness (% of nominal). Industry: replace at 94%; warn 94–96.
  rope: { criticalBelow: 94, warningBelow: 96 },
  // Normalization caps used by the score (each term clamped 0..1).
  cap: {
    vibration: 0.25, // RMS g
    levelingMm: 8,
    currentA: 30,
    ageYears: 30,
    ropeRiskPct: 10, // (100 - condition); cap at 10pts of thinning
  },
  // Indicative INR ticket per modernization (used for revenue opportunity card).
  ticketInr: 2_750_000,
} as const;

// Pinned per business rule: age is computed against 2026.
export const NOW_YEAR = 2026;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Modernization Score (0..1):
 *   S = 0.40·RopeRisk + 0.20·Vib + 0.20·LevelErr + 0.10·CurrentStrain + 0.10·UnitAge
 * Each term normalized 0..1 against THRESHOLDS.cap.
 *   RopeRisk = (100 − Main_Rope_Condition) / cap.ropeRiskPct
 */
export function modernizationScore(u: ElevatorUnit): number {
  const ropeRisk = clamp01(Math.max(0, 100 - u.Main_Rope_Condition) / THRESHOLDS.cap.ropeRiskPct);
  const vib = clamp01(u.Vibration_RMS / THRESHOLDS.cap.vibration);
  const lvl = clamp01(Math.abs(u.Leveling_Accuracy_mm) / THRESHOLDS.cap.levelingMm);
  const cur = clamp01(u.Current_Draw_A / THRESHOLDS.cap.currentA);
  const age = clamp01((NOW_YEAR - u.Install_Year) / THRESHOLDS.cap.ageYears);
  return +(0.4 * ropeRisk + 0.2 * vib + 0.2 * lvl + 0.1 * cur + 0.1 * age).toFixed(3);
}

/**
 * Status mapping. Rope condition is a hard safety override:
 *   < 94%  → CRITICAL  (immediate shutdown territory)
 *   94–96% → WARNING   (plan for replacement)
 * Otherwise the modernization score drives the band.
 */
export function statusForUnit(u: ElevatorUnit, score: number): UnitStatus {
  if (u.Main_Rope_Condition < THRESHOLDS.rope.criticalBelow) return "critical";
  if (u.Main_Rope_Condition < THRESHOLDS.rope.warningBelow) return "warning";
  if (score >= THRESHOLDS.criticalScore) return "critical";
  if (score >= THRESHOLDS.warningScore) return "warning";
  return "healthy";
}

// Back-compat: a few callers still use score-only mapping.
export function statusForScore(score: number): UnitStatus {
  if (score >= THRESHOLDS.criticalScore) return "critical";
  if (score >= THRESHOLDS.warningScore) return "warning";
  return "healthy";
}

// Sales-pipeline criteria: legacy install OR rope thinning into replacement zone.
export const LEAD_RULES = {
  installBefore: 2011,
  ropeBelow: 96.0,
} as const;

export function isModernizationLead(u: ElevatorUnit): boolean {
  return u.Install_Year < LEAD_RULES.installBefore || u.Main_Rope_Condition < LEAD_RULES.ropeBelow;
}

/**
 * Human-readable justification for why a unit qualifies as a modernization lead.
 * Rope-condition warnings always lead the list because they are a safety hazard.
 */
export function leadReasons(u: ScoredUnit): string[] {
  const reasons: string[] = [];
  if (u.Main_Rope_Condition < THRESHOLDS.rope.criticalBelow) {
    reasons.push(
      `CRITICAL: Rope Thickness ${u.Main_Rope_Condition.toFixed(1)}% — Immediate Shutdown Recommended`,
    );
  } else if (u.Main_Rope_Condition < THRESHOLDS.rope.warningBelow) {
    reasons.push(
      `Rope Thickness Warning: ${u.Main_Rope_Condition.toFixed(1)}% (Plan for replacement)`,
    );
  }
  if (u.Vibration_RMS > 0.15) reasons.push("High Vibration");
  if (u.Install_Year < LEAD_RULES.installBefore) reasons.push(`${u.age} Years Old`);
  if (u.Leveling_Accuracy_mm > 4) reasons.push("Leveling Drift");
  if (u.Current_Draw_A > 22) reasons.push("Current Strain");
  if (u.Motor_Temp_C > 60) reasons.push("Motor Overheat");
  return reasons.slice(0, 3);
}

export function scoreUnit(u: ElevatorUnit): ScoredUnit {
  const score = modernizationScore(u);
  return {
    ...u,
    age: NOW_YEAR - u.Install_Year,
    score,
    status: statusForUnit(u, score),
    isLead: isModernizationLead(u),
  };
}

// ---------- Mock generator (replace with CSV parser later) ----------

const SITES = [
  ["Cyber Towers", "Hyderabad"],
  ["DLF Cyber City", "Gurugram"],
  ["BKC One", "Mumbai"],
  ["Manyata Tech Park", "Bengaluru"],
  ["RMZ Ecoworld", "Bengaluru"],
  ["DLF Downtown", "Chennai"],
  ["Embassy Golf Links", "Bengaluru"],
  ["Nirlon Knowledge Park", "Mumbai"],
  ["WTC Noida", "Noida"],
  ["Salarpuria Sattva", "Hyderabad"],
  ["Brigade Gateway", "Bengaluru"],
  ["Phoenix Marketcity", "Pune"],
  ["DLF Mall of India", "Noida"],
  ["Forum Mall", "Bengaluru"],
  ["One BKC", "Mumbai"],
  ["Olympia Tech Park", "Chennai"],
] as const;

// Deterministic LCG so mock data is stable across renders.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function generateFleet(count = 200, seed = 7): ScoredUnit[] {
  const r = rng(seed);
  const units: ScoredUnit[] = [];
  for (let i = 1; i <= count; i++) {
    const [site, city] = SITES[Math.floor(r() * SITES.length)];
    // Skewed install-year distribution: more old units to make leads realistic.
    const ageBias = r();
    const age = Math.floor(
      ageBias < 0.35 ? 16 + r() * 14 : ageBias < 0.7 ? 8 + r() * 8 : 1 + r() * 7,
    );
    const install = NOW_YEAR - age;

    // Older units degrade more on average.
    const wear = Math.min(1, age / 25 + (r() - 0.5) * 0.35);

    // Rope condition: pristine ~99.5%, replacement zone ~93%. Older = thinner.
    const rope = Math.max(90, 99.5 - wear * 6 - r() * 1.2);

    const raw: ElevatorUnit = {
      Unit_ID: `FJT-${String(i).padStart(4, "0")}`,
      Site: site,
      City: city,
      Install_Year: install,
      Motor_Temp_C: +(38 + wear * 28 + r() * 4).toFixed(1),
      Vibration_RMS: +(0.04 + wear * 0.18 + r() * 0.04).toFixed(3),
      Current_Draw_A: +(10 + wear * 16 + r() * 4).toFixed(1),
      Leveling_Accuracy_mm: +(0.5 + wear * 6 + r() * 1.5).toFixed(2),
      Door_Cycles_Hour: Math.round(40 + r() * 160),
      Door_Open_Close_MS: Math.round(1800 + wear * 1400 + r() * 300),
      Main_Rope_Condition: +rope.toFixed(1),
    };
    units.push(scoreUnit(raw));
  }
  return units;
}

// ---------- Aggregations for the Executive Overview ----------

export interface FleetSummary {
  total: number;
  critical: number;
  warning: number;
  healthy: number;
  leads: number;
  revenueInr: number;
  histogram: { bucket: string; count: number }[];
  distribution: { name: string; value: number; key: UnitStatus }[];
}

export function summarize(units: ScoredUnit[]): FleetSummary {
  const critical = units.filter((u) => u.status === "critical").length;
  const warning = units.filter((u) => u.status === "warning").length;
  const healthy = units.filter((u) => u.status === "healthy").length;
  const leads = units.filter((u) => u.isLead).length;

  const buckets = ["0.0–0.2", "0.2–0.4", "0.4–0.6", "0.6–0.8", "0.8–1.0"];
  const histogram = buckets.map((b) => ({ bucket: b, count: 0 }));
  for (const u of units) {
    const idx = Math.min(4, Math.floor(u.score * 5));
    histogram[idx].count++;
  }

  return {
    total: units.length,
    critical,
    warning,
    healthy,
    leads,
    revenueInr: leads * THRESHOLDS.ticketInr,
    histogram,
    distribution: [
      { name: "Healthy", value: healthy, key: "healthy" },
      { name: "Warning", value: warning, key: "warning" },
      { name: "Critical", value: critical, key: "critical" },
    ],
  };
}

export function formatInrCompact(n: number): string {
  // ₹ in crore / lakh — Indian executive convention.
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ---------- CSV ingestion ----------

// Required headers for the customer-facing telemetry feed.
export const REQUIRED_CSV_HEADERS = [
  "Timestamp",
  "Elevator_ID",
  "Install_Year",
  "Motor_Temp_C",
  "Vibration_RMS",
  "Current_Draw_A",
  "Leveling_Accuracy_mm",
  "Door_Cycles_Hour",
  "Door_Open_Close_MS",
  "Main_Rope_Condition",
  "Target_State",
] as const;

export type CsvRow = Record<(typeof REQUIRED_CSV_HEADERS)[number], string>;

export interface CsvValidation {
  ok: boolean;
  missing: string[];
  extra: string[];
}

export function validateCsvHeaders(headers: string[]): CsvValidation {
  const set = new Set(headers.map((h) => h.trim()));
  const missing = REQUIRED_CSV_HEADERS.filter((h) => !set.has(h));
  const extra = headers.filter(
    (h) => !REQUIRED_CSV_HEADERS.includes(h.trim() as (typeof REQUIRED_CSV_HEADERS)[number]),
  );
  return { ok: missing.length === 0, missing, extra };
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Aggregate a long-format telemetry CSV into one ScoredUnit per Elevator_ID.
 * The latest row per elevator (by Timestamp) drives the displayed reading;
 * Install_Year is taken from the first non-empty value seen.
 */
export function csvRowsToUnits(rows: CsvRow[]): ScoredUnit[] {
  const byId = new Map<string, { latest: CsvRow; ts: number; install: number }>();
  for (const row of rows) {
    const id = String(row.Elevator_ID ?? "").trim();
    if (!id) continue;
    const ts = Date.parse(row.Timestamp ?? "") || 0;
    const install = num(row.Install_Year, 0);
    const cur = byId.get(id);
    if (!cur || ts >= cur.ts) {
      byId.set(id, { latest: row, ts, install: install || cur?.install || 0 });
    } else if (!cur.install && install) {
      cur.install = install;
    }
  }

  const units: ScoredUnit[] = [];
  for (const [id, { latest, install }] of byId) {
    const unit: ElevatorUnit = {
      Unit_ID: id,
      Site: "Imported Site",
      City: "—",
      Install_Year: install || NOW_YEAR - 5,
      Motor_Temp_C: num(latest.Motor_Temp_C),
      Vibration_RMS: num(latest.Vibration_RMS),
      Current_Draw_A: num(latest.Current_Draw_A),
      Leveling_Accuracy_mm: num(latest.Leveling_Accuracy_mm),
      Door_Cycles_Hour: num(latest.Door_Cycles_Hour),
      Door_Open_Close_MS: num(latest.Door_Open_Close_MS),
      Main_Rope_Condition: num(latest.Main_Rope_Condition, 100),
    };
    units.push(scoreUnit(unit));
  }
  return units;
}
