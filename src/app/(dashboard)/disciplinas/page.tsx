"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Library,
  Calendar,
  Filter,
  RotateCcw,
  Loader2,
  GraduationCap,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Course } from "@/lib/types/subjects";
import { DisciplinasList } from "./disciplinas-list"; // Importando o novo componente separado

type Period = { id: string; name: string; is_active: boolean };

function useDisciplinasSearchParams() {
  const searchParams = useSearchParams();
  const cursoId = searchParams.get("cursoId");
  const periodoId = searchParams.get("periodoId");
  return { cursoId, periodoId };
}

function DisciplinasPageContent() {
  const tenant = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const { cursoId, periodoId } = useDisciplinasSearchParams();

  const canEdit = tenant.active
    ? isAdminLike(tenant.active.role) || tenant.active.role === "coord_geral"
    : false;

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Course[];
    },
    enabled: !!tenant.active,
  });

  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ["periods", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("periods")
        .select("id, name, is_active")
        .eq("institution_id", tenant.active.institutionId)
        .order("name", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Period[];
    },
    enabled: !!tenant.active,
  });

  const handleParamChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key === "cursoId") {
      params.delete("periodoId");
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  const isFiltered = !!(cursoId || periodoId);

  const STEPS = [
    { id: "curso", label: "Curso", completed: !!cursoId, icon: GraduationCap },
    { id: "periodo", label: "Período", completed: !!periodoId, icon: Calendar },
    { id: "disciplinas", label: "Listagem", completed: false, icon: Library },
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);

  return (
    <>
      <PageHeader
        title="Disciplinas"
        description="Gestão de matriz curricular e disciplinas por curso e período."
        actions={
          isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.replace(pathname)}
              className="text-xs shadow-2xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar Seleção
            </Button>
          )
        }
      />
      <PageBody>
        <div className="space-y-6">
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">1. Curso</Label>
                  <Select
                    value={cursoId ?? ""}
                    onValueChange={(v) => handleParamChange("cursoId", v)}
                    disabled={coursesLoading}
                  >
                    <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                      {coursesLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Carregando...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Selecione um curso" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">2. Período Letivo</Label>
                  <Select
                    value={periodoId ?? ""}
                    onValueChange={(v) => handleParamChange("periodoId", v)}
                    disabled={!cursoId || periodsLoading}
                  >
                    <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                      {periodsLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Carregando...</span>
                        </div>
                      ) : (
                        <SelectValue
                          placeholder={
                            !cursoId ? "Escolha um curso primeiro" : "Selecione um período"
                          }
                        />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          {opt.name} {opt.is_active ? "(Ativo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {cursoId && periodoId ? (
            <DisciplinasList
              cursoId={cursoId}
              periodoId={periodoId}
              canEdit={canEdit}
              courses={courses}
              periods={periods}
            />
          ) : (
            <Card className="border-dashed border-border/80 bg-card/40">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-4">
                  <Library className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Selecione o Contexto para Visualizar as Disciplinas
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md leading-relaxed">
                  Para otimizar o desempenho, escolha sequencialmente o <strong>Curso</strong> e o{" "}
                  <strong>Período Letivo</strong> desejado acima para carregar a lista de disciplinas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageBody>
    </>
  );
}

export default function DisciplinasPageWrapper() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DisciplinasPageContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
