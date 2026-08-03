"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlunosList } from "./alunos-list";
import { AlunosFilterStepper } from "./components/alunos-filter-stepper";
import { AlunosSkeleton } from "./components/alunos-skeleton";
import { Card, CardContent } from "@/components/ui/card";

function useAlunosSearchParams() {
  const searchParams = useSearchParams();
  const cursoId = searchParams.get("cursoId") || searchParams.get("curso_id");
  const poloId = searchParams.get("poloId") || searchParams.get("polo_id");
  const turmaId = searchParams.get("turmaId") || searchParams.get("turma_id");

  return { cursoId, poloId, turmaId };
}

function AlunosPageContent() {
  const active = useActiveTenant();
  const router = useRouter();
  const pathname = usePathname();
  const { cursoId, poloId, turmaId } = useAlunosSearchParams();

  const canEdit = active
    ? isAdminLike(active.role) || active.role === "coord_geral"
    : false;

  // 1. Query Cursos
  const { data: cursos = [], isLoading: cursosLoading } = useQuery({
    queryKey: ["cursos-alunos-filter", active?.institutionId, active?.isPoloScoped, active?.scopedPoloIds],
    queryFn: async () => {
      if (!active?.institutionId) return [];

      let query;
      if (active.isPoloScoped && active.scopedPoloIds?.length > 0) {
        query = supabase
          .from("courses")
          .select("id, name, course_polos!inner(polo_id)")
          .in("course_polos.polo_id", active.scopedPoloIds);
      } else {
        query = supabase
          .from("courses")
          .select("id, name")
          .eq("institution_id", active.institutionId);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;

      return (data || []).map(({ id, name }) => ({
        id,
        name,
        label: name,
      }));
    },
    enabled: !!active?.institutionId,
  });

  // 2. Query Polos (Resiliente e com checagem de escopo)
  const { data: polos = [], isLoading: polosLoading } = useQuery({
    queryKey: ["polos-alunos-filter", cursoId, active?.institutionId, active?.isPoloScoped, active?.scopedPoloIds],
    queryFn: async () => {
      if (!active?.institutionId || !cursoId) return [];

      // A. Busca os IDs dos polos vinculados a este curso na tabela pivô
      const { data: cpData, error: cpError } = await supabase
        .from("course_polos")
        .select("polo_id")
        .eq("course_id", cursoId);

      if (cpError) throw cpError;
      if (!cpData || cpData.length === 0) return [];

      let poloIds = cpData.map((item) => item.polo_id);

      // B. Aplica o filtro de escopo do usuário (ex: Coord. Polo)
      if (active.isPoloScoped && active.scopedPoloIds?.length > 0) {
        poloIds = poloIds.filter((id) => active.scopedPoloIds.includes(id));
      }

      if (poloIds.length === 0) return [];

      // C. Busca os nomes diretamente na tabela de polos (liberada na RLS)
      const { data: polosData, error: polosError } = await supabase
        .from("polos")
        .select("id, name")
        .in("id", poloIds)
        .order("name");

      if (polosError) throw polosError;

      return (polosData || []).map((p) => ({
        id: p.id,
        name: p.name,
        label: p.name,
      }));
    },
    enabled: !!active?.institutionId && !!cursoId,
  });

  // 3. Query Turmas
  const { data: turmas = [], isLoading: turmasLoading } = useQuery({
    queryKey: ["turmas-alunos-filter", cursoId, poloId, active?.institutionId],
    queryFn: async () => {
      if (!active?.institutionId || !cursoId || !poloId) return [];

      const { data, error } = await supabase
        .from("classes")
        .select("id, name, period")
        .eq("institution_id", active.institutionId)
        .eq("course_id", cursoId)
        .eq("polo_id", poloId)
        .order("period", { ascending: false });

      if (error) throw error;

      return (data || []).map((t) => ({
        id: t.id,
        name: `${t.name} (${t.period})`,
        label: `${t.name} (${t.period})`,
      }));
    },
    enabled: !!active?.institutionId && !!cursoId && !!poloId,
  });

  const handleParamChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Limpa os seletores dependentes ao resetar etapas anteriores
    if (key === "cursoId") {
      params.delete("poloId");
      params.delete("turmaId");
    } else if (key === "poloId") {
      params.delete("turmaId");
    }

    // { scroll: false } evita que o Next.js role a página de volta ao topo a
    // cada troca de filtro — é isso que causava o "pulo" visual ao selecionar
    // Curso/Polo/Turma.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
              onClick={() => router.replace(pathname, { scroll: false })}
              className="text-xs shadow-2xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar Seleção
            </Button>
          )
        }
      />
      <PageBody>
        <div className="space-y-6">
          <AlunosFilterStepper
            cursoId={cursoId}
            poloId={poloId}
            turmaId={turmaId}
            cursos={cursos}
            polos={polos}
            turmas={turmas}
            cursosLoading={cursosLoading}
            polosLoading={polosLoading}
            turmasLoading={turmasLoading}
            onParamChange={handleParamChange}
          />

          {turmaId ? (
            <AlunosList turmaId={turmaId} canEdit={canEdit} />
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

export default function AlunosPageWrapper() {
  return (
    <Suspense fallback={<AlunosSkeleton />}>
      <AlunosPageContent />
    </Suspense>
  );
}