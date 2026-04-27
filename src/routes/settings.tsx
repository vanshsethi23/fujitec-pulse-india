import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Database,
  IndianRupee,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFleetData } from "@/components/fleet/fleet-data-context";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Fujitec Pulse" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell crumb="Settings">
      <SettingsBody />
    </AppShell>
  );
}

function SettingsBody() {
  const { thresholds, setThresholds, averageTicketInr, setAverageTicketInr, reset, clearLocalState, theme, toggleTheme } = useFleetData();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [warn, setWarn] = useState(String(thresholds.ropeWarningBelow));
  const [crit, setCrit] = useState(String(thresholds.ropeCriticalBelow));
  const [atv, setAtv] = useState(String(averageTicketInr));

  const onSaveThresholds = () => {
    const w = parseFloat(warn);
    const c = parseFloat(crit);
    if (!Number.isFinite(w) || !Number.isFinite(c)) {
      toast.error("Thresholds must be valid numbers.");
      return;
    }
    if (w <= c) {
      toast.error("Warning threshold must be greater than critical.");
      return;
    }
    if (c < 50 || w > 100) {
      toast.error("Thresholds must sit between 50% and 100%.");
      return;
    }
    setThresholds({ ropeWarningBelow: w, ropeCriticalBelow: c });
    toast.success("Thresholds saved · fleet rescored");
  };

  const onSaveCommercial = () => {
    const next = parseFloat(atv);
    if (!Number.isFinite(next) || next <= 0) {
      toast.error("Average ticket size must be a valid positive number.");
      return;
    }
    setAverageTicketInr(Math.round(next));
    toast.success("Global Revenue Opportunity recalibrated.");
  };

  const onReset = () => {
    if (!confirm("Wipe uploaded CSV and clear stored data?")) return;
    reset();
    toast.success("System reset · archetype dataset restored");
  };

  const onLogout = async () => {
    await logout();
    clearLocalState();
    toast.success("Signed out");
    await navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <div className="pb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Configure safety thresholds, manage data and switch interface theme.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Safety Thresholds */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <header className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/30 bg-brand/10 text-brand">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Safety Thresholds</h2>
              <p className="text-[11px] text-muted-foreground">
                Drives status banding & lead detection across the platform.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="warn"
                className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
              >
                Rope Replacement Trigger (%)
              </Label>
              <Input
                id="warn"
                type="number"
                step="0.1"
                value={warn}
                onChange={(e) => setWarn(e.target.value)}
                className="mt-1.5 h-9 border-border bg-surface font-mono text-[13px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Default 96%</p>
            </div>
            <div>
              <Label
                htmlFor="crit"
                className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
              >
                Critical Shutdown Limit (%)
              </Label>
              <Input
                id="crit"
                type="number"
                step="0.1"
                value={crit}
                onChange={(e) => setCrit(e.target.value)}
                className="mt-1.5 h-9 border-border bg-surface font-mono text-[13px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Default 94%</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Saving rescores every unit using the new thresholds.
            </p>
            <Button
              size="sm"
              onClick={onSaveThresholds}
              className="h-9 bg-brand text-[12px] font-medium text-brand-foreground hover:bg-brand/90"
            >
              Save Thresholds
            </Button>
          </div>
        </section>

        {/* Theme */}
        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/30 bg-brand/10 text-brand">
              {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
              <p className="text-[11px] text-muted-foreground">
                Currently using <span className="font-mono text-foreground">{theme}</span> mode.
              </p>
            </div>
          </header>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-full border-border bg-surface text-[12px] text-foreground"
          >
            {theme === "dark" ? (
              <>
                <Sun className="mr-1.5 h-3.5 w-3.5" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="mr-1.5 h-3.5 w-3.5" />
                Switch to Dark Mode
              </>
            )}
          </Button>
        </section>

        {/* Commercial Configurations */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-3">
          <header className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-healthy/30 bg-healthy/10 text-healthy">
              <IndianRupee className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Commercial Configurations</h2>
              <p className="text-[11px] text-muted-foreground">
                Controls revenue opportunity calculations across dashboard, leads and reports.
              </p>
            </div>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label
                htmlFor="atv"
                className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
              >
                Average Modernization Ticket Size (ATV)
              </Label>
              <Input
                id="atv"
                type="number"
                min="1"
                step="1000"
                value={atv}
                onChange={(e) => setAtv(e.target.value)}
                className="mt-1.5 h-9 border-border bg-surface font-mono text-[13px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Default ₹14.50 L</p>
            </div>
            <Button
              size="sm"
              onClick={onSaveCommercial}
              className="h-9 bg-brand text-[12px] font-medium text-brand-foreground hover:bg-brand/90"
            >
              Save Commercial Settings
            </Button>
          </div>
        </section>

        {/* Data Management */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-3">
          <header className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-warning/30 bg-warning/10 text-warning">
              <Database className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Data Management</h2>
              <p className="text-[11px] text-muted-foreground">
                Reset the workspace or sign out of this session.
              </p>
            </div>
          </header>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-foreground">System Reset</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Wipe the uploaded CSV, clear stored fleet data and restore the archetype dataset.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReset}
                  className="h-9 border-warning/40 bg-warning/10 text-[12px] text-warning hover:bg-warning/20 hover:text-warning"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-foreground">Sign Out</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Clear your session and return to the login screen.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onLogout}
                  className="h-9 border-critical/40 bg-critical/10 text-[12px] text-critical hover:bg-critical/20 hover:text-critical"
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
