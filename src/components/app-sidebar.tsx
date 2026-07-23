"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Mail, BookOpen, MapPin, Layers, GraduationCap,
  UserSquare2, Settings, ClipboardList, ListChecks, PencilRuler, Sparkles, ArrowRight,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";

type NavItem = { title: string; url: string; icon: React.ElementType };

const INICIO: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Central de Notas", url: "/notas", icon: PencilRuler },
];

const ESTRUTURA: NavItem[] = [
  { title: "Polos", url: "/polos", icon: MapPin },
  { title: "Cursos", url: "/cursos", icon: BookOpen },
  { title: "Turmas", url: "/turmas", icon: Layers },
  { title: "Disciplinas", url: "/disciplinas", icon: ClipboardList },
];

const PESSOAS_BASE: NavItem[] = [
  { title: "Alunos", url: "/alunos", icon: GraduationCap },
];

const PESSOAS_ADMIN: NavItem[] = [
  { title: "Colaboradores", url: "/colaboradores", icon: UserSquare2 },
];

const ADMIN_ONLY: NavItem[] = [
  { title: "Templates de Notas", url: "/templates-notas", icon: ListChecks },
  { title: "Convites", url: "/convites", icon: Mail },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { active } = useTenant();
  const pathname = usePathname();
  const role = active?.role;
  const admin = isAdminLike(role);

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const pessoas = admin ? [...PESSOAS_BASE, ...PESSOAS_ADMIN] : PESSOAS_BASE;

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            {active?.institutionName?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {active?.institutionName ?? "Selecione"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {active ? `${active.city} — ${active.state}` : ""}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Início", INICIO)}
        {renderGroup("Estrutura Acadêmica", ESTRUTURA)}
        {renderGroup("Pessoas", pessoas)}
        {admin && renderGroup("Administração", ADMIN_ONLY)}
      </SidebarContent>
      {admin && (
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          <PremiumCard />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function PremiumCard() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/5 text-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium tracking-tight">SGE Premium</span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Notas, relatórios avançados e histórico de aprovações.
      </p>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80 transition hover:text-foreground"
      >
        Conhecer <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
