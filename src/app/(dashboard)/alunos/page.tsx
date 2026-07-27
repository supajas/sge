"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Filter,
  Loader2,
  RotateCcw,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
} from "lucide-react";
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlunosList } from "./alunos-list";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Hook para gerenciar os parâmetros da URL
function useAlunosSearchParams() {
  const searchParams = useSearchParams();
  const cursoId = searchParams.get("cursoId");
  const poloId = searchParams.get("poloId");
  const turmaId = searchParams.get("turmaId");
  return { cursoId, poloId, turmaId };
}

// Componente principal do conteúdo da página
function AlunosPageContent() {
  const tenant = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const { cursoId, poloId, turmaId } = useAlunosSearchParams();

  const canEdit = tenant.active
    ? isAdminLike(tenant.active.role) || tenant.active.role === "coord_geral"
    : false;

  // --- QUERIES PARA OS FILTROS ---

  const { data: cursos = [], isLoading: cursosLoading } = useQuery({
    queryKey: ["cursos-alunos-filter", tenant.active?.institutionId, tenant.active?.isPoloScoped],
    queryFn: async () => {
      if (!tenant.active) return [];
      let query;
      if (tenant.active.isPoloScoped) {
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
      return data.map(({ id, name }) => ({ id, name }));
    },
    enabled: !!tenant.active,
  });

  const { data: polos = [], isLoading: polosLoading } = useQuery({
    queryKey: ["polos-alunos-filter", cursoId, tenant.active?.isPoloScoped],
    queryFn: async () => {
      if (!tenant.active || !cursoId) return [];
      let query = supabase
        .from("course_polos")
        .select("polos!inner(id, name)")
        .eq("course_id", cursoId);

      if (tenant.active.isPoloScoped) {
        query = query.in("polo_id", tenant.active.scopedPoloIds);
      }
      const { data, error } = await query.order("name", {
        foreignTable: "polos",
      });
      if (error) throw error;
      return data.map((item) => item.polos).filter(Boolean) as { id: string; name: string }[];
    },
    enabled: !!tenant.active && !!cursoId,
  });

  const { data: turmas = [], isLoading: turmasLoading } = useQuery({
    queryKey: ["turmas-alunos-filter", cursoId, poloId],
    queryFn: async () => {
      if (!tenant.active || !cursoId || !poloId) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, period")
        .eq("institution_id", tenant.active.institutionId)
        .eq("course_id", cursoId)
        .eq("polo_id", poloId)
        .order("period", { ascending: false });
      if (error) throw error;
      return data.map((t) => ({
        id: t.id,
        label: `${t.name} (${t.period})`,
      }));
    },
    enabled: !!tenant.active && !!cursoId && !!poloId,
  });

  // --- HANDLERS PARA MUDANÇA NOS FILTROS ---

  const handleParamChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key === "cursoId") {
      params.delete("poloId");
      params.delete("turmaId");
    } else if (key === "poloId") {
      params.delete("turmaId");
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  const STEPS = [
    { id: "curso", label: "Curso", completed: !!cursoId, icon: GraduationCap },
    { id: "polo", label: "Polo", completed: !!poloId, icon: Building2 },
    { id: "turma", label: "Turma", completed: !!turmaId, icon: BookOpen },
    { id: "alunos", label: "Listagem de Alunos", completed: false, icon: Users },
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);

  const selects = [
    {
      id: "curso",
      label: "1. Curso",
      value: cursoId,
      onValueChange: (v: string) => handleParamChange("cursoId", v),
      options: cursos,
      placeholder: "Selecione um curso",
      disabled: cursosLoading,
      loading: cursosLoading,
    },
    {
      id: "polo",
      label: "2. Polo",
      value: poloId,
      onValueChange: (v: string) => handleParamChange("poloId", v),
      options: polos,
      placeholder: cursoId ? "Selecione um polo" : "Escolha um curso primeiro",
      disabled: !cursoId || polosLoading,
      loading: polosLoading,
    },
    {
      id: "turma",
      label: "3. Turma",
      value: turmaId,
      onValueChange: (v: string) => handleParamChange("turmaId", v),
      options: turmas,
      placeholder: poloId ? "Selecione uma turma" : "Escolha um polo primeiro",
      disabled: !poloId || turmasLoading,
      loading: turmasLoading,
    },
  ];

  const isFiltered = !!(cursoId || poloId || turmaId);

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Consulte e gerencie as matrículas selecionando o contexto educacional."
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
          {/* Card do Filtro e Stepper */}
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
                {selects.map((s) => (
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
            </CardContent>
          </Card>

          {/* Conteúdo Dinâmico */}
          {turmaId ? (
            <div className="space-y-4">
              <AlunosList turmaId={turmaId} canEdit={canEdit} />
            </div>
          ) : (
            <Card className="border-dashed border-border/80 bg-card/40">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Selecione o Contexto para Visualizar os Alunos
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md leading-relaxed">
                  Para otimizar o desempenho, escolha sequencialmente o <strong>Curso</strong>, o{" "}
                  <strong>Polo</strong> e a <strong>Turma</strong> desejada acima para carregar a lista de estudantes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageBody>
    </>
  );
}

// Fallback visual durante o carregamento de parâmetros na URL
function AlunosPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// Encapsulamento com Suspense como boa prática do Next.js
export default function AlunosPageWrapper() {
  return (
    <Suspense fallback={<AlunosPageSkeleton />}>
      <AlunosPageContent />
    </Suspense>
  );
}
