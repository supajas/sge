"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Mail, BookOpen, MapPin, Layers, GraduationCap,
  UserSquare2, Settings, ClipboardList, ListChecks, PencilRuler, Sparkles, ArrowRight,
  ChevronRight, Calendar
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
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
  const { setOpenMobile } = useSidebar();
  const admin = isAdminLike(active?.role);

  // Verificação de URL ativa mais precisa
  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const estruturaItems: NavItem[] = [
    ...ESTRUTURA.slice(0, 2), // Polos, Cursos
    ...(admin ? [{ title: "Períodos", url: "/periodos", icon: Calendar }] : []),
    ...ESTRUTURA.slice(2), // Turmas, Disciplinas
  ];

  const menuGroups = [
    { label: "Início", items: INICIO },
    { label: "Estrutura Acadêmica", items: estruturaItems },
    { label: "Pessoas", items: admin ? [...PESSOAS_BASE, ...PESSOAS_ADMIN] : PESSOAS_BASE },
    ...(admin ? [{ label: "Administração", items: ADMIN_ONLY }] : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar">
      {/* HEADER DA INSTITUIÇÃO */}
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-2 shadow-xs transition-colors hover:bg-accent/40">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/80 font-semibold text-primary-foreground text-sm shadow-xs ring-1 ring-white/20">
            {active?.institutionName?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold tracking-tight text-foreground">
              {active?.institutionName ?? "Selecione a Instituição"}
            </span>
            {active && (
              <span className="truncate text-[10px] text-muted-foreground/80 font-medium">
                {active.city} • {active.state}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      {/* CONTEÚDO DA NAVEGAÇÃO */}
      <SidebarContent className="px-2 py-1">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const activeState = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={activeState}
                        tooltip={item.title}
                        className={`relative transition-all duration-150 ease-in-out font-medium text-xs ${
                          activeState
                            ? "bg-accent/80 text-foreground font-semibold shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        }`}
                      >
                        <Link href={item.url} onClick={() => setOpenMobile(false)}>
                          <item.icon className={`h-4 w-4 shrink-0 ${activeState ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* FOOTER PREMIUM */}
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <PremiumCard />
      </SidebarFooter>
    </Sidebar>
  );
}

function PremiumCard() {
  const { setOpenMobile } = useSidebar();
  return (
    <Link
      href="/premium"
      onClick={() => setOpenMobile(false)}
      className="group relative block overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 via-background to-background p-3.5 shadow-xs transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-foreground">SGE Premium</span>
        </div>
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
          PRO
        </span>
      </div>
      
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Desbloqueie inteligência artificial, relatórios avançados e automações.
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text.xs">
        <span className="text-[11px] font-medium text-primary">Conhecer recursos</span>
        <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
