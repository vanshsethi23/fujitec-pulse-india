import { useState } from "react";
import { Bell, Database, Search, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataUploadDialog } from "@/components/fleet/data-upload-dialog";
import { useFleetData } from "@/components/fleet/fleet-data-context";

export function TopBar({ crumb }: { crumb: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { source, units } = useFleetData();

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

        <Avatar className="h-9 w-9 border border-border">
          <AvatarFallback className="bg-brand/15 text-[11px] font-semibold text-brand">
            RS
          </AvatarFallback>
        </Avatar>
      </div>

      <DataUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </header>
  );
}
