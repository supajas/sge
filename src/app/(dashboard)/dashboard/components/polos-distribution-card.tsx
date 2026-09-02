"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, GraduationCap, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant";
import { hasPermission } from "@/config/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type PoloStat = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  activeCount: number;
  totalEnrolled: number;
  retentionRate: number;
};

export function PolosDistributionCard() {
  const active = useActiveTenant();
  const currentRole = active?.role;
  const canViewPolos = hasPermission(currentRole, "view:polos");

  const { data, isLoading } = useQuery({
    queryKey: [
      "dashboard-polos-distribution",
      active.institutionId,
      currentRole,
      active.isPoloScoped,
      active.scopedPoloIds,
    ],
    queryFn: async () => {
      if (!active.institutionId || !canViewPolos) {
        return { polosList: [], totalActive: 0, totalEnrolled: 0 };
      }

      // 1. Polos respeitando permissão e escopo
      let poloQuery = supabase
        .from("polos")
        .select("id, name, city, state")
        .eq("institution_id", active.institutionId)
        .order("name");

      if (active.isPoloScoped && active.scopedPoloIds?.length > 0) {
        poloQuery = poloQuery.in("id", active.scopedPoloIds);
      }

      const { data: polosData, error: poloErr } = await poloQuery;
      if (poloErr) throw poloErr;

      const polos = polosData ?? [];
      if (polos.length === 0) {
        return { polosList: [], totalActive: 0, totalEnrolled: 0 };
      }

      // 2. Turmas e alunos (todos os status)
      const { data: classesData, error: classErr } = await supabase
        .from("classes")
        .select("id, polo_id, students(id, status)")
        .eq("institution_id", active.institutionId);

      if (classErr) throw classErr;

      // 3. Mapeia a contagem de ativos e total matriculados por polo
      const activeMap: Record<string, number> = {};
      const totalMap: Record<string, number> = {};

      for (const p of polos) {
        activeMap[p.id] = 0;
        totalMap[p.id] = 0;
      }

      if (classesData) {
        for (const c of classesData) {
          if (c.polo_id && totalMap[c.polo_id] !== undefined) {
            const rawStudents = (c.students ?? []) as unknown as { id: string; status: string }[];
            totalMap[c.polo_id] += rawStudents.length;
            const activeStudents = rawStudents.filter((st) => st.status === "ativo").length;
            activeMap[c.polo_id] += activeStudents;
          }
        }
      }

      let overallActive = 0;
      let overallEnrolled = 0;

      const polosList: PoloStat[] = polos.map((p) => {
        const activeCount = activeMap[p.id] ?? 0;
        const totalEnrolled = totalMap[p.id] ?? 0;
        const retentionRate = totalEnrolled > 0 ? Math.round((activeCount / totalEnrolled) * 100) : 0;

        overallActive += activeCount;
        overallEnrolled += totalEnrolled;

        return {
          id: p.id,
          name: p.name,
          city: p.city,
          state: p.state,
          activeCount,
          totalEnrolled,
          retentionRate,
        };
      });

      // Ordenação: polos com mais alunos ativos / maior retenção no topo
      polosList.sort((a, b) => b.activeCount - a.activeCount || b.retentionRate - a.retentionRate);

      return { polosList, totalActive: overallActive, totalEnrolled: overallEnrolled };
    },
    enabled: !!active.institutionId && canViewPolos,
  });

  if (!canViewPolos) return null;

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const { polosList = [], totalActive = 0, totalEnrolled = 0 } = data || {};

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/60 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Distribuição de Alunos por Polo
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ranking e taxa de retenção de discentes por unidade
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="font-normal text-xs bg-accent/60 text-muted-foreground">
            <GraduationCap className="mr-1 h-3 w-3" />
            {totalActive.toLocaleString("pt-BR")} ativos / {totalEnrolled.toLocaleString("pt-BR")} total
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {polosList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
            <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            Nenhum polo encontrado ou vinculado.
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
            {polosList.map((polo) => {
              return (
                <div key={polo.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{polo.name}</span>
                      {polo.city && (
                        <span className="text-[10px] text-muted-foreground">
                          ({polo.city}{polo.state ? ` - ${polo.state}` : ""})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {polo.activeCount.toLocaleString("pt-BR")} / {polo.totalEnrolled.toLocaleString("pt-BR")} ativos
                      </span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right font-medium">
                        {polo.retentionRate}%
                      </span>
                    </div>
                  </div>

                  <Progress value={polo.retentionRate} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
