import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Fujitec Pulse" }] }),
  component: () => (
    <AppShell crumb="Settings">
      <ComingSoon title="Settings" description="Workspace, alerting & integrations." />
    </AppShell>
  ),
});
