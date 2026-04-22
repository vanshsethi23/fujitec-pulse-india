
# Fujitec Pulse — Shell & Executive Fleet Overview

Build the navigation shell and the first page of an enterprise IIoT dashboard for monitoring 200 elevators and surfacing modernization sales leads. Data ingestion comes next; this milestone delivers the visual + structural foundation with realistic mock data shaped to the eventual CSV schema.

## Visual Language

- **Theme:** Enterprise-dark, industrial. Deep slate canvas (#0B1220 background, #111827 surfaces, #1F2937 borders).
- **Brand:** Fujitec Professional Blue (#1E63D6) as primary accent, with cooler steel blues for secondary chrome.
- **Status palette:**
  - Emerald `#10B981` — Healthy
  - Amber `#F59E0B` — Warning
  - Crimson `#EF4444` — Critical
- **Typography:** Inter for UI, JetBrains Mono for telemetry values & IDs (numeric tabular feel).
- **Density:** Tight, data-dense, sharp 6px corners. Subtle 1px borders, no heavy shadows. Hairline dividers.

## App Shell

- **Persistent left sidebar (collapsible to icon rail)** with Fujitec Pulse wordmark + pulse-dot logo at top.
- **Nav items (Lucide icons):**
  - Fleet Overview (active) — `LayoutDashboard`
  - Modernization Leads — `Target`
  - Unit Inspector — `Activity`
  - Telemetry Streams — `Waves`
  - Service Tickets — `Wrench`
  - Reports — `FileBarChart`
  - Settings — `Settings`
- **Top bar:** breadcrumb + global search + environment chip ("PROD · India Region") + notifications bell + user avatar.
- Only Fleet Overview is wired in this milestone; other routes render a clean "Coming next" placeholder so navigation feels real without being deceptive.

## Executive Fleet Overview Page

### 1. Page header
Title "Executive Fleet Overview", subtitle with last-sync timestamp, right-side date-range selector (24h / 7d / 30d) and an "Export" button (visual only).

### 2. KPI strip — 4 cards
Each card: label, large monospace value, delta vs. prior period with up/down arrow, sparkline (Recharts area), and a subtle status accent bar on the left.
- **Total Fleet** — 200 units (neutral blue accent)
- **Critical Units** — count where score ≥ 0.75 (crimson accent)
- **Modernization Leads** — qualified leads: age > 15 AND vibration > 0.1 AND health < 0.4 (amber accent)
- **Revenue Opportunity** — leads × avg modernization ticket (₹, emerald accent)

### 3. Secondary insight row (adds executive depth without bloating)
Two compact panels side-by-side:
- **Fleet Health Distribution** — donut showing Healthy / Warning / Critical split.
- **Modernization Score Histogram** — bar chart bucketing all 200 units by score band.

### 4. Searchable elevator grid (all 200 units)
A dense data table (Shadcn `Table`) with:
- Columns: Unit ID, Site / Location, Install Year, Age, Vibration RMS, Bearing Health, Modernization Score, Status badge, Action (`ChevronRight` to inspector).
- **Toolbar:** search input (filters by Unit ID / site), status filter chips (All / Healthy / Warning / Critical), score sort toggle, column visibility menu.
- **Status badges** color-coded with the palette above; score rendered as a thin horizontal meter + numeric value.
- **Pagination** 25/50/100 per page; sticky header; row hover reveals the chevron.
- Mock dataset of 200 rows generated to match the eventual CSV schema (Motor_Temp_C, Vibration_RMS, Current_Draw_A, Leveling_Accuracy_mm, Door_Cycles_Hour, Door_Open_Close_MS, Bearing_Health_Index, Install_Year) so swap-in to real CSV is a one-file change.

## Architecture Notes

- Routes: `/` (Fleet Overview), plus stub routes for the other nav items so links are real and SEO-clean.
- A single `lib/fleet.ts` module owns: type definitions matching the CSV schema, the mock generator, and the Modernization Score formula `0.35·Vib + 0.25·LevelErr + 0.20·CurrentStrain + 0.20·UnitAge` (each term normalized 0–1). When the CSV arrives, we replace the generator with a parser — components stay untouched.
- Status thresholds centralized so we can tune them once the real data lands.

## Out of Scope (this milestone)
CSV ingestion, unit detail / inspector page, time-series telemetry charts, lead workflow, auth — all queued for next steps.
