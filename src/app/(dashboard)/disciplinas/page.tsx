"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Library, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { Course } from "./types";
import { Period } from "./types";
import { DisciplinasContextSelector } from "./components/disciplinas-context";
import { DisciplinasList } from "./components/disciplinas-list";
import { DisciplinasSkeleton } from "./components/disciplinas-skeleton";

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
          <DisciplinasContextSelector
            cursoId={cursoId}
            periodoId={periodoId}
            courses={courses}
            periods={periods}
            coursesLoading={coursesLoading}
            periodsLoading={periodsLoading}
            isFiltered={isFiltered}
            onParamChange={handleParamChange}
          />

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
    <Suspense fallback={<DisciplinasSkeleton />}>
      <DisciplinasPageContent />
    </Suspense>
  );
}