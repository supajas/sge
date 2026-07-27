"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  MapPin,
  Loader2,
  BookOpen,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Course = { id: string; name: string; code: string | null; polo_ids: string[] };
type Polo = { id: string; name: string };

export default function CursosPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const canEdit = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data: polos = [] } = useQuery({
    queryKey: ["polos", tenant.active?.institutionId, tenant.active?.isPoloScoped],
    queryFn: async () => {
      if (!tenant.active) return [];
      let query = supabase.from("polos").select("id, name");
      if (tenant.active.isPoloScoped) {
        query = query.in("id", tenant.active.scopedPoloIds);
      } else {
        query = query.eq("institution_id", tenant.active.institutionId);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return (data ?? []) as Polo[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["courses", tenant.active?.institutionId, tenant.active?.isPoloScoped],
    queryFn: async () => {
      if (!tenant.active) return [];
      let query;
      if (tenant.active.isPoloScoped) {
        query = supabase
          .from("courses")
          .select("id, name, code, course_polos!inner(polo_id)")
          .in("course_polos.polo_id", tenant.active.scopedPoloIds);
      } else {
        query = supabase
          .from("courses")
          .select("id, name, code, course_polos(polo_id)")
          .eq("institution_id", tenant.active.institutionId);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        polo_ids: (c.course_polos ?? []).map((cp: any) => cp.polo_id),
      })) as Course[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const save = useMutation({
    mutationFn: async (v: { name: string; code: string; polo_ids: string[] }) => {
      if (!tenant.active) throw new Error("Sem instituição ativa");
      let courseId = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from("courses")
          .update({ name: v.name, code: v.code || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: c, error } = await supabase
          .from("courses")
          .insert({ name: v.name, code: v.code || null, institution_id: tenant.active.institutionId })
          .select("id")
          .single();
        if (error || !c) throw error;
        courseId = c.id;
      }

      // Sync polos
      await supabase.from("course_polos").delete().eq("course_id", courseId!);
      if (v.polo_ids.length) {
        await supabase
          .from("course_polos")
          .insert(v.polo_ids.map((pid) => ({ course_id: courseId!, polo_id: pid })));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["polos"] });
      setFormOpen(false);
      setEditing(null);
      toast.success(editing ? "Curso atualizado com sucesso." : "Curso cadastrado com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Curso excluído com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tenant.active) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const coursesWithPolosCount = data.filter((c) => c.polo_ids.length > 0).length;

  return (
    <>
      <PageHeader
        title="Cursos"
        description="Gerencie os cursos oferecidos e sua distribuição pelos polos."
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
                  <Plus className="mr-1.5 h-4 w-4" /> Novo Curso
                </Button>
              </DialogTrigger>
              <CourseForm
                key={editing?.id ?? "new"}
                editing={editing}
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
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total de Cursos</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : data.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ofertados em Polos</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : `${coursesWithPolosCount} / ${data.length}`}
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
              <EmptyCoursesState />
            ) : (
              data.map((c) => (
                <Card key={c.id} className="border-border/60 bg-card/80 shadow-2xs">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-base tracking-tight">{c.name}</h4>
                        {c.code && (
                          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                            {c.code}
                          </Badge>
                        )}
                      </div>

                      <div className="pt-1">
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">Polos Associados:</span>
                        <PoloBadges poloIds={c.polo_ids} polosList={polos} />
                      </div>
                    </div>

                    {canEdit && (
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs hover:bg-accent"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                        <DeleteCourseDialog name={c.name} onConfirm={() => del.mutate(c.id)} />
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
                  <TableHead className="font-semibold text-foreground">Nome do Curso</TableHead>
                  <TableHead className="font-semibold text-foreground w-36">Código</TableHead>
                  <TableHead className="font-semibold text-foreground">Polos Atendidos</TableHead>
                  {canEdit && <TableHead className="w-28 text-right font-semibold text-foreground">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-52" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      {canEdit && <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="py-12">
                      <EmptyCoursesState />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((c) => (
                    <TableRow key={c.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                          <span>{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.code ? (
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {c.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <PoloBadges poloIds={c.polo_ids} polosList={polos} maxVisible={3} />
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditing(c);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <DeleteCourseDialog name={c.name} onConfirm={() => del.mutate(c.id)} isIconOnly />
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

{/* COMPONENTE AUXILIAR PARA BADGES DE POLOS COM LIMITE VISUAL */}
function PoloBadges({ poloIds, polosList, maxVisible }: { poloIds: string[]; polosList: Polo[]; maxVisible?: number }) {
  if (poloIds.length === 0) {
    return <span className="text-xs text-muted-foreground">Nenhum polo associado</span>;
  }

  const visibleIds = maxVisible ? poloIds.slice(0, maxVisible) : poloIds;
  const remainingCount = maxVisible ? poloIds.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleIds.map((pid) => {
        const p = polosList.find((x) => x.id === pid);
        return p ? (
          <Badge key={pid} variant="secondary" className="bg-muted/80 text-foreground font-normal text-[11px] border border-border/40">
            {p.name}
          </Badge>
        ) : null;
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
          +{remainingCount} polo{remainingCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

{/* ESTADO VAZIO */}
function EmptyCoursesState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
        <GraduationCap className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhum curso cadastrado</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Cadastre os cursos oferecidos pela instituição para associar disciplinas e polos.
      </p>
    </div>
  );
}

{/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
function DeleteCourseDialog({
  name,
  onConfirm,
  isIconOnly = false,
}: {
  name: string;
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
          <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o curso <strong className="text-foreground">{name}</strong>? Esta ação não pode ser desfeita e removerá os vínculos com turmas e matérias.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir Curso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

{/* FORMULÁRIO */}
function CourseForm({
  editing,
  polos,
  onSubmit,
  pending,
}: {
  editing: Course | null;
  polos: Polo[];
  onSubmit: (v: { name: string; code: string; polo_ids: string[] }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [poloIds, setPoloIds] = useState<string[]>(editing?.polo_ids ?? []);

  const selectAllPolos = () => setPoloIds(polos.map((p) => p.id));
  const clearAllPolos = () => setPoloIds([]);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Curso" : "Cadastrar Novo Curso"}</DialogTitle>
        <DialogDescription>
          Preencha o nome, código e selecione em quais polos este curso estará disponível.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, code, polo_ids: poloIds });
        }}
        className="space-y-4 pt-2"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold">
            Nome do Curso <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Ex: Licenciatura em Pedagogia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="code" className="text-xs font-semibold">
            Código / Sigla <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="code"
            placeholder="Ex: PED-2026"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Polos onde o curso é oferecido</Label>
            {polos.length > 3 && (
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
            {polos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum polo cadastrado na instituição ainda.
              </p>
            ) : (
              polos.map((p) => {
                const isChecked = poloIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) =>
                          setPoloIds((prev) => (v ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
                        }
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
          <Button type="submit" disabled={!name.trim() || pending} className="w-full sm:w-auto">
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar Curso"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
