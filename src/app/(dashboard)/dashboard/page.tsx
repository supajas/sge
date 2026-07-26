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

export default function DashboardPage() {
  const active = useActiveTenant();
  const { user, loading: isLoadingUser } = useSession();

  const { data, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats", active.institutionId],
    queryFn: async () => {
      const [polos, courses, classes, students] = await Promise.all([
        supabase.from("polos").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", active.institutionId),
      ]);
      return {
        polos: polos.count ?? 0,
        courses: courses.count ?? 0,
        classes: classes.count ?? 0,
        students: students.count ?? 0,
      };
    },
    enabled: !!active.institutionId,
  });

  if (isLoadingUser || !user) {
    return (
      <>
        <PageHeader title="Carregando..." description="Aguarde um instante" />
        <PageBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[120px] w-full" />
            ))}
          </div>
        </PageBody>
      </>
    );
  }

  const poloCount = active.isPoloScoped ? active.scopedPoloIds.length : data?.polos;

  const cards = [
    { label: "Polos", value: isLoadingStats ? "..." : poloCount ?? "—", icon: MapPin },
    { label: "Cursos", value: isLoadingStats ? "..." : data?.courses ?? "—", icon: BookOpen },
    { label: "Turmas", value: isLoadingStats ? "..." : data?.classes ?? "—", icon: Layers },
    { label: "Alunos", value: isLoadingStats ? "..." : data?.students ?? "—", icon: GraduationCap },
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${user.user_metadata.full_name}`}
        description={`Você está como ${ROLE_LABELS[active.role]}.`}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, index) => (
            <Card
              key={c.label}
              style={{
                animation: `fadeInUp 0.5s ease-out forwards`,
                animationDelay: `${index * 100}ms`,
                opacity: 0,
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{c.label}</span>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}
