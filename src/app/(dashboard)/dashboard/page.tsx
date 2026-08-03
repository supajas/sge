"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, BookOpen, Layers, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant";
import { useSession } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/roles";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { hasPermission, Permission } from "@/config/permissions";
import { Can } from "@/components/auth/Can";

export default function DashboardPage() {
  const active = useActiveTenant();
  const { user, loading: isLoadingUser } = useSession();
  const currentRole = active?.role;

  // Checagens de permissão para otimizar as chamadas
  const canViewPolos = hasPermission(currentRole, "view:polos");
  const canViewCourses = hasPermission(currentRole, "view:courses");
  const canViewClasses = hasPermission(currentRole, "view:classes");
  const canViewStudents = hasPermission(currentRole, "view:students");

  const { data, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats", active.institutionId, currentRole],
    queryFn: async () => {
      // Dispara apenas as queries de tabelas que o usuário tem permissão de ver
      const [polos, courses, classes, students] = await Promise.all([
        canViewPolos
          ? supabase.from("polos").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId)
          : Promise.resolve({ count: 0 }),
        canViewCourses
          ? supabase.from("courses").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId)
          : Promise.resolve({ count: 0 }),
        canViewClasses
          ? supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId)
          : Promise.resolve({ count: 0 }),
        canViewStudents
          ? supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId)
          : Promise.resolve({ count: 0 }),
      ]);

      return {
        polos: polos.count ?? 0,
        courses: courses.count ?? 0,
        classes: classes.count ?? 0,
        students: students.count ?? 0,
      };
    },
    enabled: !!active.institutionId && !!currentRole,
  });

  // Tela de Loading Principal (Skeletons)
  if (isLoadingUser || !user) {
    return (
      <>
        <div className="flex flex-col gap-1 px-6 pt-6">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-md mt-1" />
        </div>
        <PageBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-border/50 bg-card/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="mt-3 h-8 w-16 rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </PageBody>
      </>
    );
  }

  // Definição dos cards acompanhados da permissão exigida para exibição
  const cards: Array<{
    label: string;
    value: number | undefined;
    icon: React.ElementType;
    description: string;
    permission: Permission;
  }> = [
    {
      label: "Polos",
      value: data?.polos,
      icon: MapPin,
      description: currentRole === "coord_polo" ? "Polos atribuídos" : "Cadastrados na instituição",
      permission: "view:polos",
    },
    {
      label: "Cursos",
      value: data?.courses,
      icon: BookOpen,
      description: "Cadastrados no sistema",
      permission: "view:courses",
    },
    {
      label: "Turmas",
      value: data?.classes,
      icon: Layers,
      description: "Em andamento ou abertas",
      permission: "view:classes",
    },
    {
      label: "Alunos",
      value: data?.students,
      icon: GraduationCap,
      description: "Matriculados na instituição",
      permission: "view:students",
    },
  ];

  // Filtra dinamicamente para renderizar no grid apenas os cards permitidos para o perfil logado
  const visibleCards = cards.filter((c) => hasPermission(currentRole, c.permission));

  const userName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Usuário";
  const userRole = ROLE_LABELS[active.role] ?? active.role;

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Olá, {userName}</span>
            <Badge variant="secondary" className="font-normal text-xs bg-accent/60 text-muted-foreground">
              {userRole}
            </Badge>
          </div>
        }
        description="Acompanhe o panorama geral da sua instituição acadêmica."
      />

      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCards.map((c, index) => (
            <Card
              key={c.label}
              className="group relative overflow-hidden border-border/50 bg-card/60 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5"
              style={{
                animation: `fadeInUp 0.4s ease-out forwards`,
                animationDelay: `${index * 80}ms`,
                opacity: 0,
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {c.label}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-200 group-hover:scale-105">
                    <c.icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {isLoadingStats ? (
                      <Skeleton className="h-8 w-16" />
                    ) : typeof c.value === "number" ? (
                      c.value.toLocaleString("pt-BR")
                    ) : (
                      c.value ?? "—"
                    )}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}