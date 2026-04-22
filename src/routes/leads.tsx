import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Modernization Leads — Fujitec Pulse" }] }),
  component: () => (
    <AppShell crumb="Modernization Leads">
      <ComingSoon
        title="Modernization Leads"
        description="Ranked sales pipeline derived from telemetry — coming next."
      />
    </AppShell>
  ),
});
