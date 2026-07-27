"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Library,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Course, Subject } from "@/lib/types/subjects";
import { SubjectFormDialog } from "@/components/subject-form-dialog";
import { saveSubjectAction, saveSubjectsBulkAction, deleteSubjectAction } from "./actions";

export default function DisciplinasPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  const canEdit = tenant.active
    ? isAdminLike(tenant.active.role) || tenant.active.role === "coord_geral"
    : false;

  const { data: courses = [] } = useQuery({
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
    enabled: !!tenant.active?.institutionId,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["subjects", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, workload_hours, course_id")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const saveSingle = useMutation({
    mutationFn: saveSubjectAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Disciplina salva com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBulk = useMutation({
    mutationFn: saveSubjectsBulkAction,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setFormOpen(false);
      toast.success(`${res.count} disciplinas importadas com sucesso!`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: deleteSubjectAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Disciplina excluída com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);

  const uniqueCoursesCount = useMemo(() => {
    const courseIds = new Set(data.map((s) => s.course_id));
    return courseIds.size;
  }, [data]);

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
        title="Disciplinas"
        description="Gestão de matriz curricular e disciplinas por curso."
        actions={
          canEdit && (
            <Dialog
              open={formOpen}
              onOpenChange={(o) => {
                setFormOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="shadow-2xs">
                  <Plus className="mr-1.5 h-4 w-4" /> Nova Disciplina
                </Button>
              </DialogTrigger>
              <SubjectFormDialog
                key={editing?.id ?? "new"}
                editing={editing}
                courses={courses}
                onSubmitSingle={(v) => saveSingle.mutate(v)}
                onSubmitBulk={(items) => saveBulk.mutate(items)}
                pending={saveSingle.isPending || saveBulk.isPending}
              />
            </Dialog>
          )
        }
      />
      <PageBody>
        <div className="space-y-6">
          {/* Métricas Rápidas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Library className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total de Disciplinas</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : data.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cursos Atendidos</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : uniqueCoursesCount}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VISÃO MOBILE: CARDS */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : data.length === 0 ? (
              <EmptySubjectsState />
            ) : (
              data.map((s) => (
                <Card key={s.id} className="border-border/60 bg-card/80 shadow-2xs">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-base leading-tight">
                          {s.name}
                        </h4>
                        {s.workload_hours && (
                          <Badge variant="outline" className="font-mono text-[11px] shrink-0 bg-muted/30">
                            <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                            {s.workload_hours}h
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {courseMap.get(s.course_id) ?? "Curso não encontrado"}
                        </span>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs hover:bg-accent"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                        <DeleteSubjectDialog
                          subjectName={s.name}
                          onConfirm={() => del.mutate(s.id)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* VISÃO DESKTOP: TABELA */}
          <div className="hidden rounded-xl border border-border/60 bg-card/60 shadow-2xs overflow-hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Nome da Disciplina</TableHead>
                  <TableHead className="font-semibold text-foreground">Curso Vinculado</TableHead>
                  <TableHead className="font-semibold text-foreground w-36">Carga Horária</TableHead>
                  {canEdit && <TableHead className="w-28 text-right font-semibold text-foreground">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      {canEdit && <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="py-12">
                      <EmptySubjectsState />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((s) => (
                    <TableRow key={s.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        {s.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                          <span>{courseMap.get(s.course_id) ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground">
                          {s.workload_hours ? (
                            <>
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                              <span>{s.workload_hours}h</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditing(s);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <DeleteSubjectDialog
                              subjectName={s.name}
                              onConfirm={() => del.mutate(s.id)}
                              isIconOnly
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageBody>
    </>
  );
}

{/* ESTADO VAZIO */}
function EmptySubjectsState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
        <Library className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhuma disciplina cadastrada</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Cadastre disciplinas individualmente ou importe em lote para compor a matriz curricular dos cursos.
      </p>
    </div>
  );
}

{/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
function DeleteSubjectDialog({
  subjectName,
  onConfirm,
  isIconOnly = false,
}: {
  subjectName: string;
  onConfirm: () => void;
  isIconOnly?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {isIconOnly ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Excluir</span>
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Disciplina</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a disciplina <strong className="text-foreground">{subjectName}</strong>? Esta ação não pode ser desfeita e pode afetar as turmas vinculadas a ela.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
