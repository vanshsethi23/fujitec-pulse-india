import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { generateFleet, type ScoredUnit } from "@/lib/fleet";

interface FleetDataValue {
  units: ScoredUnit[];
  source: "mock" | "csv";
  fileName: string | null;
  setUnits: (units: ScoredUnit[], fileName: string) => void;
  reset: () => void;
}

const FleetDataContext = createContext<FleetDataValue | null>(null);

export function FleetDataProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => generateFleet(200, 7), []);
  const [units, setUnitsState] = useState<ScoredUnit[]>(initial);
  const [source, setSource] = useState<"mock" | "csv">("mock");
  const [fileName, setFileName] = useState<string | null>(null);

  const value: FleetDataValue = {
    units,
    source,
    fileName,
    setUnits: (next, name) => {
      setUnitsState(next);
      setSource("csv");
      setFileName(name);
    },
    reset: () => {
      setUnitsState(initial);
      setSource("mock");
      setFileName(null);
    },
  };

  return <FleetDataContext.Provider value={value}>{children}</FleetDataContext.Provider>;
}

export function useFleetData(): FleetDataValue {
  const ctx = useContext(FleetDataContext);
  if (!ctx) throw new Error("useFleetData must be used inside <FleetDataProvider>");
  return ctx;
}
