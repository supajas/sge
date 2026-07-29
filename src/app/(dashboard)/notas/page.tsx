"use client";

import { Suspense, useCallback, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { PageBody, PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

import { StepGrades } from "./step-grades";

const searchSchema = z.object({
  courseId: z.string().optional(),
  poloId: z.string().optional(),
  classId: z.string().optional(),
  periodId: z.string().optional(),
  subjectId: z.string().optional(),
});

type Search = z.infer<typeof searchSchema>;

function useNotasSearchParams() {
  const searchParams = useSearchParams();
  return {
    courseId: searchParams.get("courseId"),
    poloId: searchParams.get("poloId"),
    classId: searchParams.get("classId"),
    periodId: searchParams.get("periodId"),
    subjectId: searchParams.get("subjectId"),
  };
}

function NotasPageContent() {
  const tenant = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const { courseId, poloId, classId, periodId, subjectId } = useNotasSearchParams();

  const handleParamChange = useCallback(
    (key: keyof Search, value: string | null) => {
      const params = new URLSearchParams(window.location.search);
      const keys: (keyof Search)[] = ["courseId", "poloId", "classId", "periodId", "subjectId"];
      const keyIndex = keys.indexOf(key);

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      for (let i = keyIndex + 1; i < keys.length; i++) {
        params.delete(keys[i]);
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router]
  );

  // --- QUERIES ---
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["notas-courses", tenant.active?.institutionId, tenant.active?.isPoloScoped, tenant.active?.scopedPoloIds],
    queryFn: async () => {
      if (!tenant.active) return [];

      let query;
      if (tenant.active.isPoloScoped) {
        if (!tenant.active.scopedPoloIds || tenant.active.scopedPoloIds.length === 0) {
          return [];
        }
        query = supabase
          .from("courses")
          .select("id, name, course_polos!inner(polo_id)")
          .in("course_polos.polo_id", tenant.active.scopedPoloIds);
      } else {
        query = supabase
          .from("courses")
          .select("id, name")
          .eq("institution_id", tenant.active.institutionId);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;

      const uniqueCoursesMap = new Map<string, { id: string; name: string }>();
      (data ?? []).forEach((c: any) => {
        if (!uniqueCoursesMap.has(c.id)) {
          uniqueCoursesMap.set(c.id, { id: c.id, name: c.name });
        }
      });

      return Array.from(uniqueCoursesMap.values());
    },
    enabled: !!tenant.active,
  });

  const { data: polos = [], isLoading: polosLoading } = useQuery({
    queryKey: ["notas-polos", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("course_polos")
        .select("polos!inner(id, name)")
        .eq("course_id", courseId)
        .order("name", { foreignTable: "polos" });
      if (error) throw error;
      return data.map((item) => item.polos).filter(Boolean) as { id: string; name: string }[];
    },
    enabled: !!courseId,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["notas-classes", courseId, poloId],
    queryFn: async () => {
      if (!courseId || !poloId) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, period")
        .eq("course_id", courseId)
        .eq("polo_id", poloId)
        .order("period", { ascending: false });
      if (error) throw error;
      return data.map((c) => ({ id: c.id, name: c.name, hint: c.period ?? undefined }));
    },
    enabled: !!courseId && !!poloId,
  });

  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ["notas-periods", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("periods")
        .select("id, name, is_active")
        .eq("institution_id", tenant.active.institutionId)
        .order("name", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant.active,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["notas-subjects", courseId, periodId, tenant.active?.role],
    queryFn: async () => {
      if (!courseId || !periodId || !tenant.active) return [];
      let query = supabase
        .from("subjects")
        .select("id, name, workload_hours, is_active")
        .eq("course_id", courseId)
        .eq("period_id", periodId);

      if (tenant.active.role === "coord_polo") {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        hint: s.workload_hours ? `${s.workload_hours}h` : undefined,
        is_active: s.is_active,
      }));
    },
    enabled: !!courseId && !!periodId && !!tenant.active,
  });

  const STEPS = [
    { id: "curso", label: "Curso", completed: !!courseId, icon: GraduationCap },
    { id: "polo", label: "Polo", completed: !!poloId, icon: Building2 },
    { id: "turma", label: "Turma", completed: !!classId, icon: Layers },
    { id: "periodo", label: "Período", completed: !!periodId, icon: Calendar },
    { id: "disciplina", label: "Disciplina", completed: !!subjectId, icon: BookOpen },
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);
  const isFiltered = !!(courseId || poloId || classId || periodId || subjectId);

  const selects = [
    {
      id: "courseId",
      label: "1. Curso",
      value: courseId,
      onValueChange: (v: string) => handleParamChange("courseId", v),
      options: courses,
      placeholder: "Selecione um curso",
      disabled: coursesLoading,
      loading: coursesLoading,
    },
    {
      id: "poloId",
      label: "2. Polo",
      value: poloId,
      onValueChange: (v: string) => handleParamChange("poloId", v),
      options: polos,
      placeholder: courseId ? "Selecione um polo" : "Escolha um curso",
      disabled: !courseId || polosLoading,
      loading: polosLoading,
    },
    {
      id: "classId",
      label: "3. Turma",
      value: classId,
      onValueChange: (v: string) => handleParamChange("classId", v),
      options: classes.map((c) => ({ id: c.id, name: c.hint ? `${c.name} (${c.hint})` : c.name })),
      placeholder: poloId ? "Selecione uma turma" : "Escolha um polo",
      disabled: !poloId || classesLoading,
      loading: classesLoading,
    },
    {
      id: "periodId",
      label: "4. Período Letivo",
      value: periodId,
      onValueChange: (v: string) => handleParamChange("periodId", v),
      options: periods.map((p) => ({ id: p.id, name: `${p.name} ${p.is_active ? "(Ativo)" : ""}` })),
      placeholder: classId ? "Selecione um período" : "Escolha uma turma",
      disabled: !classId || periodsLoading,
      loading: periodsLoading,
    },
    {
      id: "subjectId",
      label: "5. Disciplina",
      value: subjectId,
      onValueChange: (v: string) => handleParamChange("subjectId", v),
      options: subjects,
      placeholder: periodId ? "Selecione uma disciplina" : "Escolha um período",
      disabled: !periodId || subjectsLoading,
      loading: subjectsLoading,
    },
  ];

  if (!tenant.active) {
    return <NotasPageSkeleton />;
  }

  if (subjectId && classId) {
    return (
      <>
        <PageHeader
          title="Lançamento de Notas"
          description="Preencha ou edite as notas para a disciplina e turma selecionada."
        />
        <PageBody>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleParamChange("subjectId", null)}
            className="mb-4"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar para seleção
          </Button>
          <StepGrades
            classId={classId}
            subjectId={subjectId}
            institutionId={tenant.active.institutionId}
            userRole={tenant.active.role}
            onBack={() => handleParamChange("subjectId", null)}
          />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Central de Notas"
        description="Selecione o fluxo desejado para consultar ou lançar as notas dos alunos."
        actions={
          isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => router.replace(pathname))}
              className="text-xs shadow-2xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar Seleção
            </Button>
          )
        }
      />
      <PageBody>
        <Card className="border-border/60 bg-card/60 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Seleção de Contexto</CardTitle>
              </div>
              {isFiltered && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  Filtro Ativo
                </Badge>
              )}
            </div>

            {/* Stepper Visual */}
            <ol className="pt-3 flex flex-wrap items-center gap-2 text-xs">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStepIndex === index;
                const isDone = step.completed;

                return (
                  <li key={step.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
                        isDone && "bg-primary/10 text-primary font-medium",
                        isActive && "bg-primary text-primary-foreground font-medium shadow-2xs",
                        !isDone && !isActive && "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {isDone ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5" />
                      )}
                      <span>{step.label}</span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ol>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {selects.map(
                (s) =>
                  (STEPS[selects.indexOf(s) - 1]?.completed || selects.indexOf(s) === 0) && (
                    <div key={s.id} className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">{s.label}</Label>
                      <Select
                        value={s.value ?? ""}
                        onValueChange={s.onValueChange}
                        disabled={s.disabled}
                      >
                        <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                          {s.loading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              <span className="text-muted-foreground">Carregando...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder={s.placeholder} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {s.options.map((opt: any) => (
                            <SelectItem key={opt.id} value={opt.id} className="text-xs">
                              {opt.name ?? opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
              )}
            </div>
            {currentStepIndex < STEPS.length &&
              !selects[currentStepIndex]?.loading &&
              selects[currentStepIndex]?.options.length === 0 && (
                <div className="mt-4 text-center text-xs text-muted-foreground py-4 px-2 rounded-md bg-muted/40 border border-dashed">
                  Nenhum item encontrado para{" "}
                  <span className="font-semibold text-foreground">
                    {STEPS[currentStepIndex].label}
                  </span>{" "}
                  com os filtros selecionados.
                </div>
              )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function NotasPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function NotasPageWrapper() {
  return (
    <Suspense fallback={<NotasPageSkeleton />}>
      <NotasPageContent />
    </Suspense>
  );
}
