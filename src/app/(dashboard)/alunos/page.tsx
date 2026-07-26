"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, RotateCcw, Search, X } from "lucide-react";
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
    { id: "curso", label: "Curso", completed: !!cursoId },
    { id: "polo", label: "Polo", completed: !!poloId },
    { id: "turma", label: "Turma", completed: !!turmaId },
    { id: "alunos", label: "Alunos", completed: false },
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);

  const selects = [
    {
      label: "1. Curso",
      value: cursoId,
      onValueChange: (v: string) => handleParamChange("cursoId", v),
      options: cursos,
      placeholder: "Selecione o curso",
      disabled: cursosLoading,
      loading: cursosLoading,
    },
    {
      label: "2. Polo",
      value: poloId,
      onValueChange: (v: string) => handleParamChange("poloId", v),
      options: polos,
      placeholder: cursoId ? "Selecione o polo" : "Escolha um curso primeiro",
      disabled: !cursoId || polosLoading,
      loading: polosLoading,
    },
    {
      label: "3. Turma",
      value: turmaId,
      onValueChange: (v: string) => handleParamChange("turmaId", v),
      options: turmas,
      placeholder: poloId ? "Selecione a turma" : "Escolha um polo primeiro",
      disabled: !poloId || turmasLoading,
      loading: turmasLoading,
    },
  ];

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Selecione o contexto (curso → polo → turma) para carregar os alunos."
        actions={
          (cursoId || poloId || turmaId) && (
            <Button variant="outline" size="sm" onClick={() => router.replace(pathname)}>
              <RotateCcw className="mr-1 h-4 w-4" /> Recomeçar
            </Button>
          )
        }
      />
      <PageBody>
        {/* Stepper */}
        <ol className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full border",
                  step.completed || currentStepIndex === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  step.completed || currentStepIndex === index
                    ? "font-medium"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
            </li>
          ))}
        </ol>

        {/* Selects */}
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {selects.map((s) => (
            <div key={s.label} className="space-y-1.5">
              <Label>{s.label}</Label>
              <Select value={s.value ?? ""} onValueChange={s.onValueChange} disabled={s.disabled}>
                <SelectTrigger>
                  {s.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <SelectValue placeholder={s.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {s.options.map((opt: any) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name ?? opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Content */}
        {turmaId ? (
          <div className="mt-6">
            <AlunosList turmaId={turmaId} canEdit={canEdit} />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border-2 border-dashed p-10 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Complete as etapas para carregar os alunos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nada é consultado no banco até você concluir todas as seleções — isso mantém a página
              rápida.
            </p>
          </div>
        )}
      </PageBody>
    </>
  );
}

// O Next.js recomenda envolver páginas que usam `useSearchParams` em `<Suspense>`.
export default function AlunosPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <AlunosPageContent />
    </Suspense>
  );
}
