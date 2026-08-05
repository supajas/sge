"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
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
import { ExportColumn, ExportDialog } from "./export-dialog";

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

export function StepGrades({
  classId,
  subjectId,
  institutionId,
  userRole,
  onBack,
}: {
  classId: string;
  subjectId: string;
  institutionId: string;
  userRole: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const isPoloCoordinator = userRole === "coord_polo";

  const { data, isLoading, error } = useQuery({
    queryKey: ["notas-grid", classId, subjectId, institutionId, userRole],
    queryFn: async () => {
      const { data: subject, error: subErr } = await supabase
        .from("subjects")
        .select("id, is_active")
        .eq("id", subjectId)
        .single();

      if (subErr) throw subErr;

      if (isPoloCoordinator && !subject.is_active) {
        return { isForbidden: true, fields: [], students: [], grades: [] };
      }

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
        isForbidden: false,
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
      qc.invalidateQueries({
        queryKey: ["notas-grid", classId, subjectId],
        exact: false,
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao salvar nota.");
    },
  });

  const exportColumns = useMemo<ExportColumn[]>(() => {
    if (!data?.fields) return [];
    return [
      { id: "registration", label: "Matrícula" },
      { id: "name", label: "Nome do Aluno" },
      ...data.fields.map((f) => ({
        id: f.id,
        label: f.label,
      })),
    ];
  }, [data?.fields]);

  const exportData = useMemo(() => {
    if (!data?.students || !data?.fields) return [];

    return data.students.map((s) => {
      const computedAverage = computeAverage(data.fields, s.id, gradeMap);
      const row: Record<string, string | number | null> = {
        registration: s.registration ?? "—",
        name: s.name,
      };

      data.fields.forEach((f) => {
        if (f.kind === "average") {
          row[f.id] = computedAverage != null ? computedAverage.toFixed(2) : "—";
        } else {
          const g = gradeMap.get(`${s.id}:${f.id}`);
          row[f.id] = f.kind === "status" ? g?.status_value ?? "—" : g?.value ?? "—";
        }
      });

      return row;
    });
  }, [data?.students, data?.fields, gradeMap]);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Carregando dados...</p>;

  if (error) {
    return <p className="text-sm text-destructive p-4">Ocorreu um erro ao carregar os dados.</p>;
  }

  if (data?.isForbidden) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm">
          <p className="font-medium text-destructive">Acesso Negado</p>
          <p className="text-muted-foreground mt-1">
            Esta disciplina está oculta e não pode ser acessada por seu perfil.
          </p>
          <Button size="sm" variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

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
        {/* Cabeçalho: título+badge numa linha; ações em grid de 2 colunas no
            mobile (evita amontoar tudo numa linha só em telas estreitas),
            voltando a uma única linha a partir do md. */}
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Lançamento de notas</h3>
            <Badge variant="secondary" className="gap-1">
              <Save className="h-3 w-3" /> Salvamento automático
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:w-auto md:gap-2">
            <ExportDialog
              columns={exportColumns}
              data={exportData}
              filename={`notas_turma_${classId}`}
              title="Relatório de Lançamento de Notas"
            />
            <Button size="sm" variant="ghost" onClick={onBack} className="w-full md:w-auto">
              <ArrowLeft className="mr-1 h-4 w-4" /> Trocar disciplina
            </Button>
          </div>
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
                    <div className="space-y-2 pt-2">
                      {fields.map((f) => {
                        const g = gradeMap.get(`${s.id}:${f.id}`);
                        const displayVal =
                          f.kind === "status" ? g?.status_value ?? "" : g?.value?.toString() ?? "";

                        if (f.kind === "average") {
                          return (
                            <div
                              key={f.id}
                              className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2"
                            >
                              <Label className="text-xs font-medium">{f.label}</Label>
                              <span className="text-sm font-semibold">
                                {computedAverage != null ? computedAverage.toFixed(2) : "—"}
                              </span>
                            </div>
                          );
                        }

                        // Linha compacta: label (+ máx/peso quando aplicável) à
                        // esquerda, input com largura fixa à direita — em vez
                        // de esticar 100% da largura para um valor curto.
                        return (
                          <div
                            key={f.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <Label className="text-xs font-medium text-foreground">{f.label}</Label>
                              {f.kind === "score" && (
                                <p className="text-[10px] text-muted-foreground">
                                  máx {f.max_value} · peso {f.weight}
                                </p>
                              )}
                            </div>
                            <Input
                              defaultValue={displayVal}
                              key={`${s.id}:${f.id}:${displayVal}`}
                              onBlur={(e) => {
                                const newVal = e.target.value.trim();
                                if (newVal === displayVal) return;
                                upsert.mutate({ studentId: s.id, field: f, value: newVal });
                              }}
                              className="h-9 w-20 shrink-0 text-center"
                              placeholder={f.kind === "status" ? "Ex.: Apr." : "—"}
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
