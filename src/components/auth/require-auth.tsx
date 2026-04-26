import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "./auth-context";

/**
 * Client-side guard. We intentionally avoid TanStack `beforeLoad` redirects
 * because auth state lives in localStorage and is not available during SSR.
 * Showing a brief blank gate prevents protected content from flashing.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      void navigate({
        to: "/login",
        search: { redirect: location.pathname + location.search },
        replace: true,
      });
    }
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
          Verifying session…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
