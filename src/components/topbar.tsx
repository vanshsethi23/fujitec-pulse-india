import { useState } from "react";
import { Bell, Database, LogOut, Search, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataUploadDialog } from "@/components/fleet/data-upload-dialog";
import { useFleetData } from "@/components/fleet/fleet-data-context";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";

export function TopBar({ crumb }: { crumb: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { source, units } = useFleetData();
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (session?.user ?? "AD").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    void navigate({ to: "/login", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <nav
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <span>Pulse</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{crumb}</span>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search units, sites, tickets…"
            className="h-9 w-[260px] border-border bg-surface pl-8 text-[13px]"
          />
        </div>

        <Button
          onClick={() => setUploadOpen(true)}
          size="sm"
          className="h-9 gap-1.5 bg-brand text-[12px] font-medium text-brand-foreground hover:bg-brand/90"
        >
          <Database className="h-3.5 w-3.5" />
          Upload Data
        </Button>

        <span className="hidden items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground lg:inline-flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              source === "csv"
                ? "bg-brand shadow-[0_0_6px_var(--brand)]"
                : "bg-healthy shadow-[0_0_6px_var(--healthy)]"
            }`}
          />
          {source === "csv" ? `CSV · ${units.length} units` : "PROD · India Region"}
        </span>

        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-warning" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-brand/40">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarFallback className="bg-brand/15 text-[11px] font-semibold text-brand">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-[11px]">
              <div className="font-semibold text-foreground">
                {session?.user ?? "Operator"}
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Admin · Fujitec Pulse
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-critical focus:text-critical"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DataUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </header>
  );
}
