"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Clock,
  Eye,
  EyeOff,
  Library,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";

import { Course } from "@/lib/types/subjects";
import { SubjectFormDialog } from "@/components/subject-form-dialog";
import {
  saveSubjectAction,
  saveSubjectsBulkAction,
  deleteSubjectAction,
  toggleSubjectVisibilityAction,
  toggleAllSubjectsVisibilityAction,
} from "../actions";
import { ExtendedSubject, DisciplinasListProps } from "../types";

export function DisciplinasList({
  cursoId,
  periodoId,
  canEdit,
  courses,
  periods = [],
}: DisciplinasListProps) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExtendedSubject | null>(null);

  const { data: rawSubjects = [], isLoading } = useQuery<ExtendedSubject[]>({
    queryKey: ["subjects", tenant.active?.institutionId, cursoId, periodoId],
    queryFn: async () => {
      if (!tenant.active || !cursoId || !periodoId) return [];

      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, workload_hours, course_id, period_id, is_active")
        .eq("institution_id", tenant.active.institutionId)
        .eq("course_id", cursoId)
        .eq("period_id", periodoId)
        .order("name");

      if (error) throw error;
      return (data ?? []) as ExtendedSubject[];
    },
    enabled: !!tenant.active && !!cursoId && !!periodoId,
  });

  const data = useMemo(() => {
    if (canEdit) return rawSubjects;
    return rawSubjects.filter((s) => s.is_active !== false);
  }, [rawSubjects, canEdit]);

  const saveSingle = useMutation({
    mutationFn: saveSubjectAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setFormOpen(false);
      setEditing(null);
      setTimeout(() => toast.success("Disciplina salva com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const saveBulk = useMutation({
    mutationFn: saveSubjectsBulkAction,
    onSuccess: (res: { count: number }) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setFormOpen(false);
      setTimeout(() => toast.success(`${res.count} disciplinas importadas com sucesso!`), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteSubjectAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setTimeout(() => toast.success("Disciplina excluída com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const toggleVisibility = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) =>
      toggleSubjectVisibilityAction(vars),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setTimeout(() => {
        toast.success(variables.is_active ? "Disciplina visível." : "Disciplina ocultada.");
      }, 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const toggleAll = useMutation({
    mutationFn: (vars: { course_id: string; period_id: string; is_active: boolean }) =>
      toggleAllSubjectsVisibilityAction(vars),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setTimeout(() => {
        toast.success(
          variables.is_active
            ? "Todas as disciplinas estão visíveis."
            : "Todas as disciplinas foram ocultadas."
        );
      }, 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);

  const allVisible = rawSubjects.length > 0 && rawSubjects.every((s) => s.is_active !== false);
  const allHidden = rawSubjects.length > 0 && rawSubjects.every((s) => s.is_active === false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">Disciplinas Encontradas</h3>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs shadow-2xs"
              disabled={rawSubjects.length === 0 || allVisible || toggleAll.isPending}
              onClick={() =>
                toggleAll.mutate({
                  course_id: cursoId,
                  period_id: periodoId,
                  is_active: true,
                })
              }
            >
              <Eye className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
              Exibir todas
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs shadow-2xs"
              disabled={rawSubjects.length === 0 || allHidden || toggleAll.isPending}
              onClick={() =>
                toggleAll.mutate({
                  course_id: cursoId,
                  period_id: periodoId,
                  is_active: false,
                })
              }
            >
              <EyeOff className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Ocultar todas
            </Button>

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
                periods={periods}
                defaultCourseId={cursoId}
                defaultPeriodId={periodoId}
                onSubmitSingle={(v) => saveSingle.mutate(v)}
                onSubmitBulk={(items) => saveBulk.mutate(items)}
                pending={saveSingle.isPending || saveBulk.isPending}
              />
            </Dialog>
          </div>
        )}
      </div>

      {/* Visão Mobile */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : data.length === 0 ? (
          <EmptySubjectsState hasHiddenSubjects={rawSubjects.length > 0} />
        ) : (
          data.map((s) => (
            <Card
              key={s.id}
              className={`border-border/60 bg-card/80 shadow-2xs ${
                s.is_active === false ? "opacity-60 bg-muted/20" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground text-base leading-tight">
                        {s.name}
                      </h4>
                      {canEdit && s.is_active === false && (
                        <Badge variant="secondary" className="text-[10px]">
                          Oculta
                        </Badge>
                      )}
                    </div>
                    {s.workload_hours && (
                      <Badge variant="outline" className="font-mono text-[11px] shrink-0 bg-muted/30">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                        {s.workload_hours}h
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{courseMap.get(s.course_id) ?? "—"}</span>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() =>
                        toggleVisibility.mutate({ id: s.id, is_active: s.is_active === false })
                      }
                      disabled={toggleVisibility.isPending}
                    >
                      {s.is_active === false ? (
                        <>
                          <Eye className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Exibir
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Ocultar
                        </>
                      )}
                    </Button>
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

      {/* Visão Desktop */}
      <div className="hidden rounded-xl border border-border/60 bg-card/60 shadow-2xs overflow-hidden md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-foreground">Nome da Disciplina</TableHead>
              <TableHead className="font-semibold text-foreground w-32">Carga Horária</TableHead>
              {canEdit && <TableHead className="font-semibold text-foreground w-28">Status</TableHead>}
              {canEdit && (
                <TableHead className="w-36 text-right font-semibold text-foreground">
                  Ações
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  {canEdit && <TableCell><Skeleton className="h-5 w-16" /></TableCell>}
                  {canEdit && <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 2} className="py-8">
                  <EmptySubjectsState hasHiddenSubjects={rawSubjects.length > 0} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((s) => (
                <TableRow
                  key={s.id}
                  className={`hover:bg-accent/30 transition-colors ${
                    s.is_active === false ? "opacity-60 bg-muted/10" : ""
                  }`}
                >
                  <TableCell className="font-medium text-foreground">{s.name}</TableCell>
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
                    <TableCell>
                      {s.is_active === false ? (
                        <Badge variant="secondary" className="text-xs">
                          Oculta
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          Visível
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={s.is_active === false ? "Exibir disciplina" : "Ocultar disciplina"}
                          onClick={() =>
                            toggleVisibility.mutate({
                              id: s.id,
                              is_active: s.is_active === false,
                            })
                          }
                          disabled={toggleVisibility.isPending}
                        >
                          {s.is_active === false ? (
                            <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span className="sr-only">
                            {s.is_active === false ? "Exibir" : "Ocultar"}
                          </span>
                        </Button>
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
  );
}

function EmptySubjectsState({ hasHiddenSubjects }: { hasHiddenSubjects?: boolean }) {
  if (hasHiddenSubjects) {
    return (
      <div className="text-center text-xs text-amber-600 dark:text-amber-400 py-3 px-3 rounded-md bg-amber-500/10 border border-amber-500/20 max-w-lg mx-auto">
        Não há disciplinas ativas ou visíveis cadastradas para este período letivo.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
        <Library className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhuma disciplina encontrada</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Não há disciplinas cadastradas para os critérios selecionados.
      </p>
    </div>
  );
}

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
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Excluir</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Disciplina</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a disciplina{" "}
            <strong className="text-foreground">{subjectName}</strong>? Esta ação não pode ser desfeita.
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
