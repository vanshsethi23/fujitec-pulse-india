import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import fujitecLogo from "@/assets/fujitec-logo.png";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Fujitec Pulse" },
      { name: "description", content: "Authenticate to access the Fujitec Pulse IIoT control center." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already logged in, bounce home immediately.
  if (isAuthenticated) {
    void navigate({ to: search.redirect ?? "/", replace: true });
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    // Slight delay so the spinner is perceivable; feels less "instant".
    await new Promise((r) => setTimeout(r, 350));
    const result = login(user, pass);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void navigate({ to: search.redirect ?? "/", replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Industrial grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in oklab, var(--brand) 18%, transparent), transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 items-center justify-center rounded-md border border-border bg-white/95 px-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">
            <img
              src={fujitecLogo}
              alt="Fujitec"
              width={1584}
              height={672}
              className="h-9 w-auto"
            />
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Fujitec Pulse
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            IIoT Intelligence Console
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={onSubmit}
          className="rounded-md border border-border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]"
        >
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            Authorized personnel only
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Operator ID
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  autoComplete="username"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="Enter operator ID"
                  className="h-10 border-border bg-surface pl-8 text-[13px]"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Passcode
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 border-border bg-surface pl-8 text-[13px]"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical/10 p-2.5 text-[12px] text-critical">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="h-10 w-full bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Session persisted on this device
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Fujitec Pulse · Confidential prototype
        </p>
      </div>
    </div>
  );
}
