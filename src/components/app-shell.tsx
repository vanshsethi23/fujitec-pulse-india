import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/topbar";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/auth/require-auth";

export function AppShell({ crumb, children }: { crumb: string; children: ReactNode }) {
  return (
    <RequireAuth>
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
    </RequireAuth>
  );
}
