"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, BookOpen, Layers, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant";
import { PageBody, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/roles";

export default function DashboardPage() {
  const active = useActiveTenant();
  const { data } = useQuery({
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
  });

  const cards = [
    { label: "Polos", value: data?.polos ?? "—", icon: MapPin },
    { label: "Cursos", value: data?.courses ?? "—", icon: BookOpen },
    { label: "Turmas", value: data?.classes ?? "—", icon: Layers },
    { label: "Alunos", value: data?.students ?? "—", icon: GraduationCap },
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${active.institutionName}`}
        description={`Você está como ${ROLE_LABELS[active.role]}.`}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
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
