import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "fujitec-pulse:auth-v1";

// Hardcoded prototype credentials (per PM brief).
const ADMIN_USER = "bodelhi";
const ADMIN_PASS = "fujitec2026";

interface AuthSession {
  user: string;
  loggedInAt: number;
}

interface AuthValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (user: string, pass: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.user) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());

  // Cross-tab sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSession(loadSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: AuthValue = {
    session,
    isAuthenticated: session !== null,
    login: (user, pass) => {
      if (user.trim() !== ADMIN_USER || pass !== ADMIN_PASS) {
        return { ok: false, error: "Invalid credentials." };
      }
      const next: AuthSession = { user: user.trim(), loggedInAt: Date.now() };
      setSession(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return { ok: true };
    },
    logout: () => {
      setSession(null);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
