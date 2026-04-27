import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: { displayName: string | null; region: string | null; roles: string[] } | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signup: (email: string, password: string) => Promise<{ ok: true; message: string } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const db = supabase as any;

async function ensureUserRecords(user: User) {
  await db.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Operator",
      region: "Delhi NCR",
    },
    { onConflict: "user_id" },
  );
  await db.from("user_roles").upsert(
    { user_id: user.id, role: "operator" },
    { onConflict: "user_id,role", ignoreDuplicates: true },
  );
  await db.from("fleet_settings").upsert({ user_id: user.id }, { onConflict: "user_id" });
}

async function loadProfile(user: User | null) {
  if (!user) return null;
  await ensureUserRecords(user);
  const [{ data: profile }, { data: roles }] = await Promise.all([
    db.from("profiles").select("display_name, region").eq("user_id", user.id).maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  return {
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? null,
    region: profile?.region ?? "Delhi NCR",
    roles: Array.isArray(roles) ? roles.map((r: { role: string }) => r.role) : ["operator"],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthValue["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null).then((nextProfile) => {
        if (alive) setProfile(nextProfile);
      });
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      return loadProfile(data.session?.user ?? null).then((nextProfile) => {
        if (alive) setProfile(nextProfile);
      });
    }).finally(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    isAuthenticated: session !== null,
    loading,
    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: error.message };
      if (data.user) await ensureUserRecords(data.user);
      return { ok: true };
    },
    signup: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) return { ok: false, error: error.message };
      if (data.user && data.session) await ensureUserRecords(data.user);
      return { ok: true, message: data.session ? "Account created." : "Check your email to verify your account." };
    },
    logout: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },
  }), [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
