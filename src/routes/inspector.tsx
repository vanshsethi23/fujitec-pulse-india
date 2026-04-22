import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/inspector")({
  head: () => ({ meta: [{ title: "Unit Inspector — Fujitec Pulse" }] }),
  component: () => (
    <AppShell crumb="Unit Inspector">
      <ComingSoon
        title="Unit Inspector"
        description="Per-unit deep dive across all sensor channels."
      />
    </AppShell>
  ),
});
