"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  MapPin,
  Layers,
  ClipboardList,
  Inbox,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "./breadcrumbs";
import { StepGrades } from "./step-grades";

const searchSchema = z.object({
  course: z.string().optional(),
  polo: z.string().optional(),
  klass: z.string().optional(),
  subject: z.string().optional(),
});

type Search = z.infer<typeof searchSchema>;

export default function NotasPage() {
  const tenant = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const course = searchParams.get("course") ?? "";
  const polo = searchParams.get("polo") ?? "";
  const klass = searchParams.get("klass") ?? "";
  const subject = searchParams.get("subject") ?? "";

  const step = subject ? 4 : klass ? 3 : polo ? 2 : course ? 1 : 0;

  const setSearch = useCallback(
    (newSearch: Partial<Search>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(newSearch).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  if (!tenant.active) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Central de Notas"
        description="Selecione o fluxo desejado para consultar ou lançar as notas dos alunos."
      />
      <PageBody>
        <Breadcrumbs
          course={course}
          polo={polo}
          klass={klass}
          subject={subject}
          institutionId={tenant.active.institutionId}
        />

        <div className="mt-4">
          {step === 0 && (
            <StepCourses
              onSelect={(id) => setSearch({ course: id, polo: "", klass: "", subject: "" })}
            />
          )}
          {step === 1 && (
            <StepPolos
              courseId={course}
              onSelect={(id) => setSearch({ polo: id })}
              onBack={() => setSearch({ course: "", polo: "", klass: "", subject: "" })}
            />
          )}
          {step === 2 && (
            <StepClasses
              courseId={course}
              poloId={polo}
              onSelect={(id) => setSearch({ klass: id })}
              onBack={() => setSearch({ polo: "", klass: "", subject: "" })}
            />
          )}
          {step === 3 && (
            <StepSubjects
              courseId={course}
              onSelect={(id) => setSearch({ subject: id })}
              onBack={() => setSearch({ klass: "", subject: "" })}
            />
          )}
          {step === 4 && (
            <StepGrades
              classId={klass}
              subjectId={subject}
              institutionId={tenant.active.institutionId}
              onBack={() => setSearch({ subject: "" })}
            />
          )}
        </div>
      </PageBody>
    </>
  );
}

{/* COMPONENTE GENÉRICO DE SELEÇÃO REFINADO */}
function PickList({
  title,
  subtitle,
  stepNumber,
  icon: Icon,
  items,
  onSelect,
  onBack,
  empty,
  isLoading,
}: {
  title: string;
  subtitle?: string;
  stepNumber?: number;
  icon?: React.ElementType;
  items: { id: string; name: string; hint?: string }[];
  onSelect: (id: string) => void;
  onBack?: () => void;
  empty: string;
  isLoading: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/60 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
              {stepNumber && (
                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                  Passo {stepNumber} de 4
                </Badge>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {onBack && (
          <Button size="sm" variant="ghost" onClick={onBack} className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-5">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">{empty}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique os cadastros no menu correspondente.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className="group relative flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-4 text-left shadow-2xs transition-all duration-200 hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm"
              >
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                    {it.name}
                  </span>
                  {it.hint && (
                    <div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted text-muted-foreground border-border/40">
                        {it.hint}
                      </Badge>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

{/* ETAPAS COM ÍCONES E MENSAGENS PERSONALIZADAS */}
function StepCourses({ onSelect }: { onSelect: (id: string) => void }) {
  const tenant = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["notas-courses", tenant.active?.institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", tenant.active!.institutionId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant.active?.institutionId,
  });

  return (
    <PickList
      title="Selecione o curso"
      subtitle="Escolha qual curso você deseja acessar"
      stepNumber={1}
      icon={BookOpen}
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      empty="Nenhum curso cadastrado nesta instituição."
    />
  );
}

function StepPolos({
  courseId,
  onSelect,
  onBack,
}: {
  courseId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["notas-course-polos", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_polos")
        .select("polos!inner(id, name)")
        .eq("course_id", courseId);
      if (error) throw error;
      return (data ?? []).map((r) => r.polos as unknown as { id: string; name: string });
    },
  });

  return (
    <PickList
      title="Selecione o polo"
      subtitle="Escolha o polo onde a turma está vinculada"
      stepNumber={2}
      icon={MapPin}
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      onBack={onBack}
      empty="Este curso não está vinculado a nenhum polo no momento."
    />
  );
}

function StepClasses({
  courseId,
  poloId,
  onSelect,
  onBack,
}: {
  courseId: string;
  poloId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["notas-classes", courseId, poloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, period")
        .eq("course_id", courseId)
        .eq("polo_id", poloId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, name: c.name, hint: c.period ?? undefined }));
    },
  });

  return (
    <PickList
      title="Selecione a turma"
      subtitle="Filtre pela turma em que deseja lançar notas"
      stepNumber={3}
      icon={Layers}
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      onBack={onBack}
      empty="Nenhuma turma cadastrada para esta combinação de curso e polo."
    />
  );
}

function StepSubjects({
  courseId,
  onSelect,
  onBack,
}: {
  courseId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["notas-subjects", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, workload_hours")
        .eq("course_id", courseId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        hint: s.workload_hours ? `${s.workload_hours}h` : undefined,
      }));
    },
  });

  return (
    <PickList
      title="Selecione a disciplina"
      subtitle="Escolha a disciplina para abrir a planilha de notas"
      stepNumber={4}
      icon={ClipboardList}
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      onBack={onBack}
      empty="Nenhuma disciplina encontrada para este curso."
    />
  );
}
