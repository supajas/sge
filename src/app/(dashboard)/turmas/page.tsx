"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  MapPin,
  Calendar,
  BookOpen,
  Loader2,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Turma = { id: string; name: string; period: string | null; course_id: string; polo_id: string };
type CourseWithPolos = { id: string; name: string; polo_ids: string[] };
type Polo = { id: string; name: string };

type GroupedTurma = {
  groupKey: string;
  course_id: string;
  period: string | null;
  polo_ids: string[];
  turma_ids: string[];
};

export default function TurmasPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupedTurma | null>(null);

  const canEdit = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-with-polos", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, course_polos(polo_id)")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        polo_ids: (c.course_polos as { polo_id: string }[]).map((cp) => cp.polo_id),
      }));
    },
    enabled: !!tenant.active?.institutionId,
  });

  const { data: polos = [] } = useQuery({
    queryKey: ["polos", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("polos")
        .select("id, name")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Polo[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const { data: turmasRaw = [], isLoading } = useQuery({
    queryKey: ["classes", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, period, course_id, polo_id")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return data as Turma[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const groupedTurmas = useMemo(() => {
    const groups = new Map<string, GroupedTurma>();
    turmasRaw.forEach((turma) => {
      const key = `${turma.course_id}-${turma.period}`;
      if (!groups.has(key)) {
        groups.set(key, {
          groupKey: key,
          course_id: turma.course_id,
          period: turma.period,
          polo_ids: [],
          turma_ids: [],
        });
      }
      const group = groups.get(key)!;
      group.polo_ids.push(turma.polo_id);
      group.turma_ids.push(turma.id);
    });
    return Array.from(groups.values());
  }, [turmasRaw]);

  const save = useMutation({
    mutationFn: async (v: { period: string; course_id: string; polo_ids: string[] }) => {
      if (!tenant.active) throw new Error("Sem instituição ativa");

      const courseName = courses.find((c) => c.id === v.course_id)?.name ?? "Curso";
      const generatedName = `${courseName} - ${v.period || "Período Único"}`;

      const existingTurmasInGroup = editing ? turmasRaw.filter((t) => editing.turma_ids.includes(t.id)) : [];

      const toDelete = existingTurmasInGroup.filter((et) => !v.polo_ids.includes(et.polo_id));
      const toAdd = v.polo_ids.filter((pid) => !existingTurmasInGroup.some((et) => et.polo_id === pid));

      const promises = [];

      if (toDelete.length > 0) {
        promises.push(supabase.from("classes").delete().in("id", toDelete.map((t) => t.id)));
      }

      if (toAdd.length > 0) {
        promises.push(
          supabase.from("classes").insert(
            toAdd.map((poloId) => ({
              name: generatedName,
              period: v.period || null,
              course_id: v.course_id,
              polo_id: poloId,
              institution_id: tenant.active!.institutionId,
            }))
          )
        );
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["classes-basic"] });
      setFormOpen(false);
      setEditing(null);
      toast.success(editing ? "Grupo de turmas atualizado com sucesso." : "Grupo de turmas cadastrado com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (turma_ids: string[]) => {
      const { error } = await supabase.from("classes").delete().in("id", turma_ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["classes-basic"] });
      toast.success("Grupo de turmas excluído com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    courses.forEach((c) => m.set(c.id, c.name));
    polos.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [courses, polos]);

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
        title="Turmas"
        description="Agrupamentos de curso e período, distribuídos entre os polos da instituição."
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
                  <Plus className="mr-1.5 h-4 w-4" /> Novo Grupo de Turmas
                </Button>
              </DialogTrigger>
              <TurmaForm
                key={editing?.groupKey ?? "new"}
                editing={editing}
                courses={courses}
                polos={polos}
                onSubmit={(v) => save.mutate(v)}
                pending={save.isPending}
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
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Grupos de Turmas</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : groupedTurmas.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Turmas em Polos</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : turmasRaw.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VISÃO MOBILE: CARDS */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))
            ) : groupedTurmas.length === 0 ? (
              <EmptyTurmasState />
            ) : (
              groupedTurmas.map((t) => (
                <Card key={t.groupKey} className="border-border/60 bg-card/80 shadow-2xs">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-base tracking-tight">
                          {nameMap.get(t.course_id) ?? "—"}
                        </h4>
                        <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                          {t.period ?? "—"}
                        </Badge>
                      </div>

                      <div className="pt-1">
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                          Polos Atendidos ({t.polo_ids.length}):
                        </span>
                        <PoloBadges poloIds={t.polo_ids} nameMap={nameMap} />
                      </div>
                    </div>

                    {canEdit && (
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs hover:bg-accent"
                          onClick={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                        <DeleteTurmaGroupDialog
                          courseName={nameMap.get(t.course_id) ?? "—"}
                          period={t.period}
                          onConfirm={() => del.mutate(t.turma_ids)}
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
                  <TableHead className="font-semibold text-foreground">Curso</TableHead>
                  <TableHead className="font-semibold text-foreground w-36">Período Letivo</TableHead>
                  <TableHead className="font-semibold text-foreground">Polos Ofertados</TableHead>
                  {canEdit && <TableHead className="w-28 text-right font-semibold text-foreground">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-56" /></TableCell>
                      {canEdit && <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : groupedTurmas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="py-12">
                      <EmptyTurmasState />
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedTurmas.map((t) => (
                    <TableRow key={t.groupKey} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                          <span>{nameMap.get(t.course_id) ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{t.period ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PoloBadges poloIds={t.polo_ids} nameMap={nameMap} maxVisible={3} />
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditing(t);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <DeleteTurmaGroupDialog
                              courseName={nameMap.get(t.course_id) ?? "—"}
                              period={t.period}
                              onConfirm={() => del.mutate(t.turma_ids)}
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

{/* COMPONENTE AUXILIAR PARA BADGES DE POLOS COM SUPORTE A NOME MAP E TRUNCAGEM */}
function PoloBadges({
  poloIds,
  nameMap,
  maxVisible,
}: {
  poloIds: string[];
  nameMap: Map<string, string>;
  maxVisible?: number;
}) {
  if (poloIds.length === 0) {
    return <span className="text-xs text-muted-foreground">Nenhum polo atrelado</span>;
  }

  const visibleIds = maxVisible ? poloIds.slice(0, maxVisible) : poloIds;
  const remainingCount = maxVisible ? poloIds.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleIds.map((pid) => (
        <Badge key={pid} variant="secondary" className="bg-muted/80 text-foreground font-normal text-[11px] border border-border/40">
          {nameMap.get(pid) ?? "?"}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
          +{remainingCount} polo{remainingCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

{/* ESTADO VAZIO */}
function EmptyTurmasState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
        <Users className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhuma turma cadastrada</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Cadastre um novo grupo de turmas associando um curso, período e seus respectivos polos.
      </p>
    </div>
  );
}

{/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO DE GRUPO */}
function DeleteTurmaGroupDialog({
  courseName,
  period,
  onConfirm,
  isIconOnly = false,
}: {
  courseName: string;
  period: string | null;
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
          <AlertDialogTitle>Excluir Grupo de Turmas</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o grupo de turmas do curso <strong className="text-foreground">{courseName}</strong> para o período <strong className="text-foreground">{period ?? "Único"}</strong>? Todas as instâncias atreladas nos polos serão removidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir Turmas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

{/* FORMULÁRIO */}
function TurmaForm({
  editing,
  courses,
  polos,
  onSubmit,
  pending,
}: {
  editing: GroupedTurma | null;
  courses: CourseWithPolos[];
  polos: Polo[];
  onSubmit: (v: { period: string; course_id: string; polo_ids: string[] }) => void;
  pending: boolean;
}) {
  const initialPeriod = editing?.period?.split(".") ?? [new Date().getFullYear().toString(), "1"];
  const [year, setYear] = useState<string>(initialPeriod[0]);
  const [semester, setSemester] = useState<string>(initialPeriod[1]);
  const [courseId, setCourseId] = useState<string>(editing?.course_id ?? "");
  const [poloIds, setPoloIds] = useState<string[]>(editing?.polo_ids ?? []);

  const years = useMemo(() => Array.from({ length: 31 }, (_, i) => (2020 + i).toString()), []);
  const semesters = [
    { value: "1", label: "Período 1" },
    { value: "2", label: "Período 2" },
  ];

  const validPolosForCourse = useMemo(() => {
    if (!courseId) return [];
    const selectedCourse = courses.find((x) => x.id === courseId);
    if (!selectedCourse) return [];
    return polos.filter((p) => selectedCourse.polo_ids.includes(p.id));
  }, [courseId, courses, polos]);

  const selectAllPolos = () => setPoloIds(validPolosForCourse.map((p) => p.id));
  const clearAllPolos = () => setPoloIds([]);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Grupo de Turmas" : "Novo Grupo de Turmas"}</DialogTitle>
        <DialogDescription>
          Selecione o curso, o período letivo e os polos em que as turmas serão abertas.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const period = `${year}.${semester}`;
          onSubmit({ period, course_id: courseId, polo_ids: poloIds });
        }}
        className="space-y-4 pt-2"
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Curso <span className="text-destructive">*</span>
          </Label>
          <Select value={courseId} onValueChange={setCourseId} disabled={!!editing}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione um curso..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ano</Label>
            <Select value={year} onValueChange={setYear} disabled={!!editing}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Período</Label>
            <Select value={semester} onValueChange={setSemester} disabled={!!editing}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Polos onde a turma será ofertada</Label>
            {validPolosForCourse.length > 3 && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllPolos}
                  className="text-primary hover:underline font-medium"
                >
                  Todos
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={clearAllPolos}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 max-h-48 overflow-y-auto space-y-2">
            {!courseId ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Selecione um curso acima para visualizar os polos atrelados.
              </p>
            ) : validPolosForCourse.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum polo disponível associado a este curso.
              </p>
            ) : (
              validPolosForCourse.map((p) => {
                const isChecked = poloIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setPoloIds((prev) =>
                            checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          );
                        }}
                      />
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                    {isChecked && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="submit"
            disabled={!courseId || poloIds.length === 0 || pending}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar Turmas"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
