import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Fujitec Pulse" }] }),
  component: () => (
    <AppShell crumb="Reports">
      <ComingSoon title="Reports" description="Executive PDF & CSV exports." />
    </AppShell>
  ),
});
