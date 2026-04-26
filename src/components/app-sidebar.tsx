import {
  LayoutDashboard,
  Target,
  Activity,
  Waves,
  Wrench,
  FileBarChart,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import fujitecLogo from "@/assets/fujitec-logo.png";

const items = [
  { title: "Fleet Overview", url: "/", icon: LayoutDashboard },
  { title: "Modernization Leads", url: "/leads", icon: Target },
  { title: "Unit Inspector", url: "/inspector", icon: Activity },
  { title: "Telemetry Streams", url: "/telemetry", icon: Waves },
  { title: "Service Tickets", url: "/tickets", icon: Wrench },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-2 py-2 group-data-[collapsible=icon]:justify-center"
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-border">
            <img
              src={fujitecLogo}
              alt="Fujitec"
              width={1584}
              height={672}
              className="h-4 w-auto"
            />
          </span>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-wide text-sidebar-foreground">
                FUJITEC PULSE
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                IIoT Intelligence
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="data-[active=true]:bg-brand/15 data-[active=true]:text-brand data-[active=true]:font-medium"
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground group-data-[collapsible=icon]:justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-healthy shadow-[0_0_8px_var(--healthy)]" />
          {!collapsed && <span>Telemetry stream nominal</span>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
