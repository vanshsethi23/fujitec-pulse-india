import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "Service Tickets — Fujitec Pulse" }] }),
  component: () => (
    <AppShell crumb="Service Tickets">
      <ComingSoon
        title="Service Tickets"
        description="Field service workflow generated from anomaly events."
      />
    </AppShell>
  ),
});
