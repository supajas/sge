"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, CheckCircle2, Calendar, Clock, Info, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FieldStat = {
  id: string;
  label: string;
  kind: string;
  missingCount: number;
  totalExpected: number;
};

export function HealthCheckCard() {
  const active = useActiveTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-health-check-evaluations", active.institutionId, active.isPoloScoped, active.scopedPoloIds],
    queryFn: async () => {
      if (!active.institutionId) {
        return {
          activePeriodName: null,
          fieldStats: [],
          totalMissingGrades: 0,
          totalExpectedGrades: 0,
          overallCompletionRate: 100,
          hasActivePeriod: false,
        };
      }

      // 1. Período Letivo Ativo
      const { data: periodData, error: periodErr } = await supabase
        .from("periods")
        .select("id, name, is_active")
        .eq("institution_id", active.institutionId)
        .eq("is_active", true)
        .maybeSingle();

      if (periodErr) throw periodErr;

      if (!periodData) {
        return {
          activePeriodName: null,
          fieldStats: [],
          totalMissingGrades: 0,
          totalExpectedGrades: 0,
          overallCompletionRate: 100,
          hasActivePeriod: false,
        };
      }

      // 2. Template Padrão de Notas e seus Campos (Tipos de Avaliação)
      const { data: tplData, error: tplErr } = await supabase
        .from("grade_templates")
        .select("id, grade_template_fields(id, label, kind, weight, order_index)")
        .eq("institution_id", active.institutionId)
        .eq("is_default", true)
        .maybeSingle();

      if (tplErr) throw tplErr;

      const rawFields = (tplData?.grade_template_fields ?? []) as unknown as {
        id: string;
        label: string;
        kind: string;
        order_index: number;
      }[];

      // Filtra apenas campos de pontuação/nota (exclui médias calculadas)
      const fields = rawFields
        .filter((f) => f.kind !== "average")
        .sort((a, b) => a.order_index - b.order_index);

      // 3. Disciplinas do período ativo
      const { data: subjectsData, error: subErr } = await supabase
        .from("subjects")
        .select("id, name, course_id")
        .eq("institution_id", active.institutionId)
        .eq("period_id", periodData.id);

      if (subErr) throw subErr;

      const subjects = subjectsData ?? [];

      // 4. Turmas e Alunos com status 'ativo'
      let classesQuery = supabase
        .from("classes")
        .select("id, course_id, polo_id, students(id, status)")
        .eq("institution_id", active.institutionId);

      if (active.isPoloScoped && active.scopedPoloIds?.length > 0) {
        classesQuery = classesQuery.in("polo_id", active.scopedPoloIds);
      }

      const { data: classesData, error: classErr } = await classesQuery;
      if (classErr) throw classErr;

      // Mapeia alunos com status 'ativo' por curso
      const activeStudentsByCourse: Record<string, { id: string }[]> = {};
      if (classesData) {
        for (const c of classesData) {
          const rawStudents = (c.students ?? []) as unknown as { id: string; status: string }[];
          const activeStudents = rawStudents.filter((st) => st.status === "ativo");

          if (c.course_id) {
            if (!activeStudentsByCourse[c.course_id]) {
              activeStudentsByCourse[c.course_id] = [];
            }
            activeStudentsByCourse[c.course_id].push(...activeStudents);
          }
        }
      }

      // 5. Consulta de Notas Digitadas no Supabase
      const subjectIds = subjects.map((s) => s.id);
      let gradesData: { subject_id: string; student_id: string; template_field_id: string; value: number | null; status_value: string | null }[] = [];

      if (subjectIds.length > 0) {
        const { data: gData, error: gradeErr } = await supabase
          .from("grades")
          .select("subject_id, student_id, template_field_id, value, status_value")
          .eq("institution_id", active.institutionId)
          .in("subject_id", subjectIds);

        if (gradeErr) throw gradeErr;
        gradesData = gData ?? [];
      }

      // Set de notas lançadas (não nulas) por chave studentId:subjectId:fieldId
      const recordedGradesSet = new Set<string>();
      for (const g of gradesData) {
        if (g.value !== null || g.status_value !== null) {
          recordedGradesSet.add(`${g.student_id}:${g.subject_id}:${g.template_field_id}`);
        }
      }

      // 6. Contagem Estrita de Notas Faltantes por Tipo de Avaliação
      const fieldStatsMap: Record<string, FieldStat> = {};
      for (const f of fields) {
        fieldStatsMap[f.id] = {
          id: f.id,
          label: f.label,
          kind: f.kind,
          missingCount: 0,
          totalExpected: 0,
        };
      }

      for (const s of subjects) {
        const studentsForSubject = activeStudentsByCourse[s.course_id] ?? [];
        for (const st of studentsForSubject) {
          for (const f of fields) {
            fieldStatsMap[f.id].totalExpected++;
            const key = `${st.id}:${s.id}:${f.id}`;
            if (!recordedGradesSet.has(key)) {
              fieldStatsMap[f.id].missingCount++;
            }
          }
        }
      }

      const fieldStats = Object.values(fieldStatsMap);
      let totalMissingGrades = 0;
      let totalExpectedGrades = 0;

      for (const fs of fieldStats) {
        totalMissingGrades += fs.missingCount;
        totalExpectedGrades += fs.totalExpected;
      }

      const overallCompletionRate = totalExpectedGrades > 0
        ? Math.round(((totalExpectedGrades - totalMissingGrades) / totalExpectedGrades) * 100)
        : 100;

      return {
        activePeriodName: periodData.name,
        fieldStats,
        totalMissingGrades,
        totalExpectedGrades,
        overallCompletionRate,
        hasActivePeriod: true,
      };
    },
    enabled: !!active.institutionId,
  });

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    activePeriodName,
    fieldStats = [],
    totalMissingGrades = 0,
    overallCompletionRate = 100,
    hasActivePeriod = false,
  } = data || {};

  const isComplete = totalMissingGrades === 0;

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/60 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base font-semibold tracking-tight">
                  Health Check Operacional
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Contagem de campos de notas vazios por tipo de avaliação para discentes com status ativo.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Pendências de lançamento por tipo de avaliação (alunos ativos)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActivePeriod ? (
              <Badge variant="outline" className="text-xs font-normal border-primary/30 bg-primary/5 text-primary">
                <Calendar className="mr-1 h-3 w-3" />
                Período: {activePeriodName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal border-amber-500/30 text-amber-400">
                Sem período ativo
              </Badge>
            )}

            {hasActivePeriod && (
              isComplete ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Todas as Notas Digitadas (100%)
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {totalMissingGrades} Campos de notas Vazios
                </Badge>
              )
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasActivePeriod ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Taxa Geral de Lançamento de Notas</span>
                <span className="font-semibold text-foreground">{overallCompletionRate}%</span>
              </div>
              <Progress value={overallCompletionRate} className="h-2" />
            </div>

            {fieldStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                <BookOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                Nenhum template de avaliação configurado para esta instituição.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fieldStats.map((fs) => {
                  const isFieldComplete = fs.missingCount === 0;
                  const fieldCompletion = fs.totalExpected > 0
                    ? Math.round(((fs.totalExpected - fs.missingCount) / fs.totalExpected) * 100)
                    : 100;

                  return (
                    <div
                      key={fs.id}
                      className="rounded-lg border border-border/40 bg-background/50 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{fs.label}</span>
                        </div>

                        <div>
                          {isFieldComplete ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 text-[11px] font-normal"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              0 pendências
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[11px] font-normal"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              {fs.missingCount.toLocaleString("pt-BR")} Campos de notas Vazios
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Progress value={fieldCompletion} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
            Nenhum período letivo ativo cadastrado para a instituição.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
