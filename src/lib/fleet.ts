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
  Bearing_Health_Index: number; // 0..1, higher is healthier
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
  lead: { ageMin: 15, vibrationMin: 0.1, healthMax: 0.4 },
  // Normalization caps used by the score (each term clamped 0..1).
  cap: {
    vibration: 0.25, // RMS g
    levelingMm: 8,
    currentA: 30,
    ageYears: 30,
  },
  // Indicative INR ticket per modernization (used for revenue opportunity card).
  ticketInr: 2_750_000,
} as const;

export const NOW_YEAR = new Date().getUTCFullYear();

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Modernization Score (0..1):
 *   S = 0.35·Vib + 0.25·LevelErr + 0.20·CurrentStrain + 0.20·UnitAge
 * Each term normalized 0..1 against THRESHOLDS.cap.
 */
export function modernizationScore(u: ElevatorUnit): number {
  const vib = clamp01(u.Vibration_RMS / THRESHOLDS.cap.vibration);
  const lvl = clamp01(Math.abs(u.Leveling_Accuracy_mm) / THRESHOLDS.cap.levelingMm);
  const cur = clamp01(u.Current_Draw_A / THRESHOLDS.cap.currentA);
  const age = clamp01((NOW_YEAR - u.Install_Year) / THRESHOLDS.cap.ageYears);
  return +(0.35 * vib + 0.25 * lvl + 0.2 * cur + 0.2 * age).toFixed(3);
}

export function statusForScore(score: number): UnitStatus {
  if (score >= THRESHOLDS.criticalScore) return "critical";
  if (score >= THRESHOLDS.warningScore) return "warning";
  return "healthy";
}

export function isModernizationLead(u: ElevatorUnit): boolean {
  const age = NOW_YEAR - u.Install_Year;
  return (
    age > THRESHOLDS.lead.ageMin &&
    u.Vibration_RMS > THRESHOLDS.lead.vibrationMin &&
    u.Bearing_Health_Index < THRESHOLDS.lead.healthMax
  );
}

export function scoreUnit(u: ElevatorUnit): ScoredUnit {
  const score = modernizationScore(u);
  return {
    ...u,
    age: NOW_YEAR - u.Install_Year,
    score,
    status: statusForScore(score),
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
      Bearing_Health_Index: +Math.max(0.05, 1 - wear * 0.85 - r() * 0.1).toFixed(2),
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
