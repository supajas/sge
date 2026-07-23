"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronRight, ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
      <div className="p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Central de Notas"
        description="Selecione curso, polo, turma e disciplina para lançar as notas."
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

function Breadcrumbs({
  course,
  polo,
  klass,
  subject,
  institutionId,
}: {
  course: string;
  polo: string;
  klass: string;
  subject: string;
  institutionId: string;
}) {
  const { data: names = {} } = useQuery({
    queryKey: ["notas-names", institutionId, course, polo, klass, subject],
    queryFn: async () => {
      const out: Record<string, string> = {};
      const ids = [course, polo, klass, subject].filter(Boolean);
      if (!ids.length) return out;
      const [c, p, cl, s] = await Promise.all([
        course
          ? supabase.from("courses").select("id, name").eq("id", course).maybeSingle()
          : null,
        polo ? supabase.from("polos").select("id, name").eq("id", polo).maybeSingle() : null,
        klass ? supabase.from("classes").select("id, name").eq("id", klass).maybeSingle() : null,
        subject
          ? supabase.from("subjects").select("id, name").eq("id", subject).maybeSingle()
          : null,
      ]);
      if (c?.data) out[c.data.id] = c.data.name;
      if (p?.data) out[p.data.id] = p.data.name;
      if (cl?.data) out[cl.data.id] = cl.data.name;
      if (s?.data) out[s.data.id] = s.data.name;
      return out;
    },
  });

  const crumbs = [
    { key: "curso", id: course, label: "Curso" },
    { key: "polo", id: polo, label: "Polo" },
    { key: "turma", id: klass, label: "Turma" },
    { key: "disc", id: subject, label: "Disciplina" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href="/notas" className="hover:text-foreground">
        Início
      </Link>
      {crumbs.map((c) =>
        c.id ? (
          <span key={c.key} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{names[c.id] ?? c.label}</span>
          </span>
        ) : null
      )}
    </div>
  );
}

function PickList({
  title,
  items,
  onSelect,
  onBack,
  empty,
  isLoading,
}: {
  title: string;
  items: { id: string; name: string; hint?: string }[];
  onSelect: (id: string) => void;
  onBack?: () => void;
  empty: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          {onBack && (
            <Button size="sm" variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          )}
        </div>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className="rounded-md border bg-card px-4 py-3 text-left transition hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="text-sm font-medium">{it.name}</div>
                {it.hint && <div className="text-xs text-muted-foreground">{it.hint}</div>}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      empty="Nenhum curso disponível."
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
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      onBack={onBack}
      empty="Este curso não está vinculado a nenhum polo."
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
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      onBack={onBack}
      empty="Nenhuma turma cadastrada para este curso/polo."
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
      items={data}
      isLoading={isLoading}
      onSelect={onSelect}
      onBack={onBack}
      empty="Nenhuma disciplina cadastrada para este curso."
    />
  );
}

type Field = {
  id: string;
  label: string;
  kind: "score" | "average" | "status";
  weight: number;
  max_value: number;
  order_index: number;
};
type Student = { id: string; name: string; registration: string | null };
type Grade = {
  student_id: string;
  template_field_id: string;
  value: number | null;
  status_value: string | null;
};

function StepGrades({
  classId,
  subjectId,
  institutionId,
  onBack,
}: {
  classId: string;
  subjectId: string;
  institutionId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notas-grid", classId, subjectId, institutionId],
    queryFn: async () => {
      const [tpl, students, grades] = await Promise.all([
        supabase
          .from("grade_templates")
          .select("id, grade_template_fields(id, label, kind, weight, max_value, order_index)")
          .eq("institution_id", institutionId)
          .eq("is_default", true)
          .maybeSingle(),
        supabase.from("students").select("id, name, registration").eq("class_id", classId).order("name"),
        supabase
          .from("grades")
          .select("student_id, template_field_id, value, status_value")
          .eq("class_id", classId)
          .eq("subject_id", subjectId),
      ]);
      if (tpl.error) throw tpl.error;
      if (students.error) throw students.error;
      if (grades.error) throw grades.error;
      const fields = ((tpl.data?.grade_template_fields ?? []) as Field[])
        .slice()
        .sort((a, b) => a.order_index - b.order_index);
      return {
        fields,
        students: (students.data ?? []) as Student[],
        grades: (grades.data ?? []) as Grade[],
      };
    },
  });

  const gradeMap = useMemo(() => {
    const m = new Map<string, Grade>();
    (data?.grades ?? []).forEach((g) => m.set(`${g.student_id}:${g.template_field_id}`, g));
    return m;
  }, [data?.grades]);

  const upsert = useMutation({
    mutationFn: async (v: { studentId: string; field: Field; value: string }) => {
      const payload = {
        institution_id: institutionId,
        class_id: classId,
        subject_id: subjectId,
        student_id: v.studentId,
        template_field_id: v.field.id,
        value: v.field.kind === "status" ? null : v.value === "" ? null : Number(v.value),
        status_value: v.field.kind === "status" ? v.value || null : null,
      };
      const { error } = await supabase
        .from("grades")
        .upsert(payload, { onConflict: "student_id,subject_id,class_id,template_field_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas-grid", classId, subjectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data) return null;
  const { fields, students } = data;

  if (!fields.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm">
          Não há template padrão de notas nesta instituição.{" "}
          <Link href="/templates-notas" className="text-primary underline">
            Configurar templates
          </Link>
          .
        </CardContent>
      </Card>
    );
  }
  if (!students.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm">
          Esta turma não tem alunos cadastrados.{" "}
          <Link href="/alunos" className="text-primary underline">
            Cadastrar alunos
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Lançamento de notas</h3>
            <Badge variant="secondary" className="gap-1">
              <Save className="h-3 w-3" /> Salvamento automático
            </Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Trocar disciplina
          </Button>
        </div>

        {/* Mobile View: Accordion */}
        <div className="md:hidden">
          <Accordion type="multiple" className="w-full">
            {students.map((s) => {
              const computedAverage = computeAverage(fields, s.id, gradeMap);
              return (
                <AccordionItem value={s.id} key={s.id}>
                  <AccordionTrigger>
                    <div className="text-left">
                      <div className="font-medium">{s.name}</div>
                      {s.registration && (
                        <div className="text-xs text-muted-foreground">{s.registration}</div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {fields.map((f) => {
                        const g = gradeMap.get(`${s.id}:${f.id}`);
                        const displayVal = f.kind === "status" ? g?.status_value ?? "" : g?.value?.toString() ?? "";
                        if (f.kind === "average") {
                          return (
                            <div key={f.id} className="flex items-center justify-between rounded-md bg-muted p-3">
                              <Label>{f.label}</Label>
                              <span className="text-sm font-medium">
                                {computedAverage != null ? computedAverage.toFixed(2) : "—"}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div key={f.id}>
                            <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                            <Input
                              defaultValue={displayVal}
                              key={`${s.id}:${f.id}:${displayVal}`}
                              onBlur={(e) => {
                                const newVal = e.target.value.trim();
                                if (newVal === displayVal) return;
                                upsert.mutate({ studentId: s.id, field: f, value: newVal });
                              }}
                              className="h-9 mt-1"
                              placeholder={f.kind === "status" ? "Ex.: Aprovado" : "—"}
                              inputMode={f.kind === "status" ? "text" : "decimal"}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Desktop View: Table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Aluno</TableHead>
                {fields.map((f) => (
                  <TableHead key={f.id} className="text-center">
                    <div className="text-xs font-semibold">{f.label}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {f.kind === "status"
                        ? "situação"
                        : `máx ${f.max_value}${f.kind === "score" ? ` · peso ${f.weight}` : ""}`}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const computedAverage = computeAverage(fields, s.id, gradeMap);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      {s.registration && (
                        <div className="text-xs text-muted-foreground">{s.registration}</div>
                      )}
                    </TableCell>
                    {fields.map((f) => {
                      const g = gradeMap.get(`${s.id}:${f.id}`);
                      const displayVal =
                        f.kind === "status" ? g?.status_value ?? "" : g?.value?.toString() ?? "";
                      if (f.kind === "average") {
                        return (
                          <TableCell key={f.id} className="text-center">
                            <span className="inline-block rounded-md bg-muted px-2 py-1 text-sm font-medium">
                              {computedAverage != null ? computedAverage.toFixed(2) : "—"}
                            </span>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={f.id} className="text-center">
                          <Input
                            defaultValue={displayVal}
                            key={`${s.id}:${f.id}:${displayVal}`}
                            onBlur={(e) => {
                              const newVal = e.target.value.trim();
                              if (newVal === displayVal) return;
                              upsert.mutate({ studentId: s.id, field: f, value: newVal });
                            }}
                            className="h-8 w-24 text-center mx-auto"
                            placeholder={f.kind === "status" ? "Ex.: Aprovado" : "—"}
                            inputMode={f.kind === "status" ? "text" : "decimal"}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function computeAverage(fields: Field[], studentId: string, gradeMap: Map<string, Grade>) {
  const scores = fields.filter((f) => f.kind === "score" && f.weight > 0);
  if (!scores.length) return null;
  let num = 0,
    den = 0,
    any = false;
  for (const f of scores) {
    const g = gradeMap.get(`${studentId}:${f.id}`);
    if (g?.value != null) {
      num += Number(g.value) * f.weight;
      den += f.weight;
      any = true;
    }
  }
  return any && den > 0 ? num / den : null;
}
