import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/telemetry")({
  head: () => ({ meta: [{ title: "Telemetry Streams — Fujitec Pulse" }] }),
  component: () => (
    <AppShell crumb="Telemetry Streams">
      <ComingSoon
        title="Telemetry Streams"
        description="Live time-series sensor channels across the fleet."
      />
    </AppShell>
  ),
});
