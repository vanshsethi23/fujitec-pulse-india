import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/topbar";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/auth/require-auth";
import { useFleetData } from "@/components/fleet/fleet-data-context";

export function AppShell({ crumb, children }: { crumb: string; children: ReactNode }) {
  return (
    <RequireAuth>
      <AuthenticatedShell crumb={crumb}>{children}</AuthenticatedShell>
    </RequireAuth>
  );
}

function AuthenticatedShell({ crumb, children }: { crumb: string; children: ReactNode }) {
  const { cloudReady } = useFleetData();

  if (!cloudReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
          Syncing cloud data…
        </div>
      </div>
    );
  }

  return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <SidebarInset className="bg-background">
            <TopBar crumb={crumb} />
            <main className="flex-1 px-6 py-6">{children}</main>
          </SidebarInset>
        </div>
        <Toaster theme="dark" position="bottom-right" richColors />
      </SidebarProvider>
  );
}
