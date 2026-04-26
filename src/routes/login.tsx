import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import fujitecLogo from "@/assets/fujitec-logo.png";

interface LoginSearch { redirect?: string }

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
  const { login, signup, loginWithGoogle, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) void navigate({ to: search.redirect ?? "/", replace: true });
  }, [isAuthenticated, loading, navigate, search.redirect]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const result = mode === "signin" ? await login(email, pass) : await signup(email, pass);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (mode === "signup" && "message" in result) setMessage(result.message);
    if (mode === "signin") void navigate({ to: search.redirect ?? "/", replace: true });
  };

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    const result = await loginWithGoogle();
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in oklab, var(--brand) 18%, transparent), transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 items-center justify-center rounded-md border border-border bg-white/95 px-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">
            <img src={fujitecLogo} alt="Fujitec" width={1584} height={672} className="h-9 w-auto" />
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Fujitec Pulse</h1>
          <p className="mx-auto mt-2 max-w-[360px] text-center text-[12px] font-medium leading-relaxed text-muted-foreground">
            An IIoT-Driven Predictive Maintenance Dashboard and Automated Lead Generation System for Elevators
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-md border border-border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Secure Cloud Access
            </div>
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-[11px] font-medium text-brand hover:text-brand/80">
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@company.com" className="h-10 border-border bg-surface pl-8 text-[13px]" required autoFocus />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" className="h-10 border-border bg-surface pl-8 text-[13px]" required minLength={6} />
              </div>
            </div>

            {error && <div className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical/10 p-2.5 text-[12px] text-critical"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{error}</span></div>}
            {message && <div className="rounded-md border border-healthy/30 bg-healthy/10 p-2.5 text-[12px] text-healthy">{message}</div>}

            <Button type="submit" disabled={busy} className="h-10 w-full bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90">
              {busy ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Authenticating…</> : <>{mode === "signin" ? "Sign in" : "Create secure account"}<ArrowRight className="ml-2 h-3.5 w-3.5" /></>}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={onGoogle} className="h-10 w-full border-border bg-surface text-[13px] text-foreground">
              Continue with Google
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">© {new Date().getFullYear()} Fujitec Pulse · Secure operations workspace</p>
      </div>
    </div>
  );
}
