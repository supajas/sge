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

type Period = { id: string; name: string; is_active: boolean };
type Turma = {
  id: string;
  name: string;
  period_id: string | null;
  course_id: string;
  polo_id: string;
  periods?: { name: string } | null;
};
type CourseWithPolos = { id: string; name: string; polo_ids: string[] };
type Polo = { id: string; name: string };

type GroupedTurma = {
  groupKey: string;
  course_id: string;
  period_id: string | null;
  period_name: string;
  polo_ids: string[];
  turma_ids: string[];
};

export default function TurmasPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupedTurma | null>(null);

  const canEdit = tenant.active ? isAdminLike(tenant.active.role) : false;

  // 1. Buscar Cursos com seus Polos
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

  // 2. Buscar Polos
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

  // 3. Buscar Períodos Letivos cadastrados
  const { data: periods = [] } = useQuery({
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
    enabled: !!tenant.active?.institutionId,
  });

  // 4. Buscar Turmas (Classes) vinculadas a Periods
  const { data: turmasRaw = [], isLoading } = useQuery({
    queryKey: ["classes", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, period_id, course_id, polo_id, periods(name)")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Turma[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  // Agrupamento por Curso e Período
  const groupedTurmas = useMemo(() => {
    const groups = new Map<string, GroupedTurma>();
    turmasRaw.forEach((turma) => {
      const periodName = turma.periods?.name ?? "Sem Período";
      const key = `${turma.course_id}-${turma.period_id ?? "none"}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          groupKey: key,
          course_id: turma.course_id,
          period_id: turma.period_id,
          period_name: periodName,
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

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    courses.forEach((c) => m.set(c.id, c.name));
    polos.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [courses, polos]);

  // Mutation para Salvar / Editar
  const save = useMutation({
    mutationFn: async (v: { period_id: string; course_id: string; polo_ids: string[] }) => {
      if (!tenant.active) throw new Error("Sem instituição ativa");

      const courseName = courses.find((c) => c.id === v.course_id)?.name ?? "Curso";
      const periodObj = periods.find((p) => p.id === v.period_id);
      const periodName = periodObj ? periodObj.name : "Período Único";

      const existingTurmasInGroup = editing ? turmasRaw.filter((t) => editing.turma_ids.includes(t.id)) : [];

      const toDelete = existingTurmasInGroup.filter((et) => !v.polo_ids.includes(et.polo_id));
      const toKeep = existingTurmasInGroup.filter((et) => v.polo_ids.includes(et.polo_id));
      const toAdd = v.polo_ids.filter((pid) => !existingTurmasInGroup.some((et) => et.polo_id === pid));

      const promises = [];

      // 1. Remover turmas de polos desmarcados
      if (toDelete.length > 0) {
        promises.push(supabase.from("classes").delete().in("id", toDelete.map((t) => t.id)));
      }

      // 2. Inserir turmas para novos polos marcados
      if (toAdd.length > 0) {
        const inserts = toAdd.map((poloId) => {
          const poloName = nameMap.get(poloId) ?? "Polo";
          const generatedName = `${courseName} - ${poloName} (${periodName})`;
          return {
            name: generatedName,
            period_id: v.period_id || null,
            course_id: v.course_id,
            polo_id: poloId,
            institution_id: tenant.active!.institutionId,
          };
        });
        promises.push(supabase.from("classes").insert(inserts));
      }

      // 3. Atualizar o nome e o período das turmas mantidas
      for (const turma of toKeep) {
        const poloName = nameMap.get(turma.polo_id) ?? "Polo";
        const generatedName = `${courseName} - ${poloName} (${periodName})`;
        promises.push(
          supabase
            .from("classes")
            .update({ name: generatedName, period_id: v.period_id || null })
            .eq("id", turma.id)
        );
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["classes-basic"] });
      setFormOpen(false);
      setEditing(null);
      setTimeout(() => {
        toast.success(editing ? "Grupo de turmas e nomes atualizados com sucesso." : "Grupo de turmas cadastrado com sucesso.");
      }, 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const del = useMutation({
    mutationFn: async (turma_ids: string[]) => {
      const { error } = await supabase.from("classes").delete().in("id", turma_ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["classes-basic"] });
      setTimeout(() => {
        toast.success("Grupo de turmas excluído com sucesso.");
      }, 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

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
                periods={periods}
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
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : groupedTurmas.length}
                  </div>
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
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : turmasRaw.length}
                  </div>
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
                        <h4 className="font-semibold text-foreground text-base tracking-tight min-w-0 truncate">
                          {nameMap.get(t.course_id) ?? "—"}
                        </h4>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant="outline" className="mr-1 font-mono text-[11px]">
                            {t.period_name}
                          </Badge>
                          {canEdit && (
                            <>
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
                                periodName={t.period_name}
                                onConfirm={() => del.mutate(t.turma_ids)}
                                isIconOnly
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-1">
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                          Polos Atendidos ({t.polo_ids.length}):
                        </span>
                        <PoloBadges poloIds={t.polo_ids} nameMap={nameMap} />
                      </div>
                    </div>
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
                          <span>{t.period_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PoloBadges poloIds={t.polo_ids} nameMap={nameMap} />
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
                              periodName={t.period_name}
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

{/* COMPONENTE AUXILIAR PARA BADGES DE POLOS ORDENADOS ALFABETICAMENTE */}
function PoloBadges({
  poloIds,
  nameMap,
}: {
  poloIds: string[];
  nameMap: Map<string, string>;
}) {
  if (poloIds.length === 0) {
    return <span className="text-xs text-muted-foreground">Nenhum polo atrelado</span>;
  }

  const sortedPoloIds = [...poloIds].sort((a, b) => {
    const nameA = nameMap.get(a) ?? "";
    const nameB = nameMap.get(b) ?? "";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sortedPoloIds.map((pid) => (
        <Badge key={pid} variant="secondary" className="bg-muted/80 text-foreground font-normal text-[11px] border border-border/40">
          {nameMap.get(pid) ?? "?"}
        </Badge>
      ))}
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
        Cadastre um novo grupo de turmas associando um curso, período letivo e seus respectivos polos.
      </p>
    </div>
  );
}

{/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO DE GRUPO */}
function DeleteTurmaGroupDialog({
  courseName,
  periodName,
  onConfirm,
  isIconOnly = false,
}: {
  courseName: string;
  periodName: string;
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
            Tem certeza que deseja excluir o grupo de turmas do curso <strong className="text-foreground">{courseName}</strong> para o período <strong className="text-foreground">{periodName}</strong>? Todas as instâncias atreladas nos polos serão removidas.
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
  periods,
  onSubmit,
  pending,
}: {
  editing: GroupedTurma | null;
  courses: CourseWithPolos[];
  polos: Polo[];
  periods: Period[];
  onSubmit: (v: { period_id: string; course_id: string; polo_ids: string[] }) => void;
  pending: boolean;
}) {
  const [periodId, setPeriodId] = useState<string>(editing?.period_id ?? "");
  const [courseId, setCourseId] = useState<string>(editing?.course_id ?? "");
  const [poloIds, setPoloIds] = useState<string[]>(editing?.polo_ids ?? []);

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
          Selecione o curso, o período letivo cadastrado e os polos em que as turmas serão abertas.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ period_id: periodId, course_id: courseId, polo_ids: poloIds });
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

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Período Letivo <span className="text-destructive">*</span>
          </Label>
          <Select value={periodId} onValueChange={setPeriodId} disabled={!!editing}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione o período..." />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.is_active ? "(Ativo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            disabled={!courseId || !periodId || poloIds.length === 0 || pending}
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
