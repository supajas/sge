"use client";

import { Suspense, useCallback, startTransition } from "react";
import {
  ArrowLeft,
  BookOpen,
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
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

import { StepGrades } from "./components/step-grades";
import { useNotasFilters } from "./queries/use-notas-filters";

const searchSchema = z.object({
  courseId: z.string().optional(),
  classId: z.string().optional(),
  periodId: z.string().optional(),
  subjectId: z.string().optional(),
});

type Search = z.infer<typeof searchSchema>;

function useNotasSearchParams() {
  const searchParams = useSearchParams();
  return {
    courseId: searchParams.get("courseId"),
    classId: searchParams.get("classId"),
    periodId: searchParams.get("periodId"),
    subjectId: searchParams.get("subjectId"),
  };
}

function NotasPageContent() {
  const tenant = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const { courseId, classId, periodId, subjectId } = useNotasSearchParams();

  const handleParamChange = useCallback(
    (key: keyof Search, value: string | null) => {
      const params = new URLSearchParams(window.location.search);
      const keys: (keyof Search)[] = ["courseId", "classId", "periodId", "subjectId"];
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

  const {
    courses,
    coursesLoading,
    classes,
    classesLoading,
    periods,
    periodsLoading,
    subjects,
    subjectsLoading,
  } = useNotasFilters({
    tenantActive: tenant.active,
    courseId,
    classId,
    periodId,
  });

  // Checa se o período foi selecionado e se há disciplinas disponíveis
  const hasSubjectsAvailable = !periodId || subjectsLoading || subjects.length > 0;

  // Monta a lista de passos dinamicamente (oculta 'disciplina' se não houver nenhuma no período)
  const STEPS = [
    { id: "curso", label: "Curso", completed: !!courseId, icon: GraduationCap },
    { id: "turma", label: "Turma", completed: !!classId, icon: Layers },
    { id: "periodo", label: "Período", completed: !!periodId, icon: Calendar },
    ...(hasSubjectsAvailable
      ? [{ id: "disciplina", label: "Disciplina", completed: !!subjectId, icon: BookOpen }]
      : []),
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);
  const isFiltered = !!(courseId || classId || periodId || subjectId);

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
      visible: true,
    },
    {
      id: "classId",
      label: "2. Turma",
      value: classId,
      onValueChange: (v: string) => handleParamChange("classId", v),
      options: classes.map((c) => ({ id: c.id, name: c.hint ? `${c.name} (${c.hint})` : c.name })),
      placeholder: courseId ? "Selecione uma turma" : "Escolha um curso",
      disabled: !courseId || classesLoading,
      loading: classesLoading,
      visible: !!courseId,
    },
    {
      id: "periodId",
      label: "3. Período Letivo",
      value: periodId,
      onValueChange: (v: string) => handleParamChange("periodId", v),
      options: periods.map((p) => ({ id: p.id, name: `${p.name} ${p.is_active ? "(Ativo)" : ""}` })),
      placeholder: classId ? "Selecione um período" : "Escolha uma turma",
      disabled: !classId || periodsLoading,
      loading: periodsLoading,
      visible: !!classId,
    },
    {
      id: "subjectId",
      label: "4. Disciplina",
      value: subjectId,
      onValueChange: (v: string) => handleParamChange("subjectId", v),
      options: subjects,
      placeholder: periodId ? "Selecione uma disciplina" : "Escolha um período",
      disabled: !periodId || subjectsLoading,
      loading: subjectsLoading,
      // Só fica visível se houver disciplinas ativas para o período selecionado
      visible: !!periodId && (subjectsLoading || subjects.length > 0),
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

            {/* Stepper Visual Adaptativo */}
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
            <div className="grid gap-4 md:grid-cols-4">
              {selects
                .filter((s) => s.visible)
                .map((s) => (
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
                ))}
            </div>

            {/* Alerta amigável apenas se um Período for escolhido, não houver disciplinas ativas e o carregamento terminou */}
            {periodId && !subjectsLoading && subjects.length === 0 && (
              <div className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400 py-3 px-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                Não há disciplinas ativas ou visíveis cadastradas para este período letivo.
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