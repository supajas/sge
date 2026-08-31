"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, ScrollText, ShieldCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Visão Geral", url: "/plataforma", icon: LayoutDashboard },
  { title: "Instituições", url: "/plataforma/instituicoes", icon: Building2 },
  { title: "Usuários", url: "/plataforma/usuarios", icon: Users },
  { title: "Logs", url: "/plataforma/logs", icon: ScrollText },
];

export function PlataformaSidebar() {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/plataforma") return pathname === "/plataforma";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold text-foreground">Platform Admin</p>
            <p className="truncate text-[10px] text-muted-foreground">Governança global</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-1">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "relative bg-accent/80 text-foreground font-semibold shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      }
                    >
                      <Link href={item.url}>
                        <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
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
    </Sidebar>
  );
}
