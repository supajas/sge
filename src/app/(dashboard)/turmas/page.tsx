"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

type Turma = { id: string; name: string; period: string | null; course_id: string; polo_id: string };
type CourseWithPolos = { id: string; name: string; polo_ids: string[] };
type Polo = { id: string; name: string };

// Type for the new grouped data structure
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
      if (!tenant.active) throw new Error("No active institution");

      const courseName = courses.find((c) => c.id === v.course_id)?.name ?? "Curso";
      const generatedName = `${courseName} - ${v.period || "Período Único"}`;

      const existingTurmasInGroup = editing ? turmasRaw.filter((t) => editing.turma_ids.includes(t.id)) : [];
      
      const toDelete = existingTurmasInGroup.filter(et => !v.polo_ids.includes(et.polo_id));
      const toAdd = v.polo_ids.filter(pid => !existingTurmasInGroup.some(et => et.polo_id === pid));

      const promises = [];

      if (toDelete.length > 0) {
        promises.push(supabase.from("classes").delete().in("id", toDelete.map(t => t.id)));
      }

      if (toAdd.length > 0) {
        promises.push(supabase.from("classes").insert(toAdd.map(poloId => ({
          name: generatedName,
          period: v.period || null,
          course_id: v.course_id,
          polo_id: poloId,
          institution_id: tenant.active!.institutionId,
        }))));
      }
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["classes-basic"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Grupo de turmas salvo com sucesso.");
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
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Turmas"
        description="Agrupamentos de curso e período, disponíveis em um ou mais polos."
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
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo Grupo de Turmas</Button>
              </DialogTrigger>
              <TurmaForm
                key={editing?.groupKey}
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
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Polos</TableHead>
                {canEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : groupedTurmas.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhuma turma cadastrada.</TableCell></TableRow>
              ) : (
                groupedTurmas.map((t) => (
                  <TableRow key={t.groupKey}>
                    <TableCell className="font-medium">{nameMap.get(t.course_id) ?? "—"}</TableCell>
                    <TableCell>{t.period ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {t.polo_ids.map(pid => <Badge key={pid} variant="secondary">{nameMap.get(pid) ?? '?'}</Badge>)}
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o grupo de turmas do curso "{nameMap.get(t.course_id)}" para o período {t.period}? Todos os polos associados serão desfeitos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(t.turma_ids)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageBody>
    </>
  );
}

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
  const initialPeriod = editing?.period?.split('.') ?? [new Date().getFullYear().toString(), '1'];
  const [year, setYear] = useState<string>(initialPeriod[0]);
  const [semester, setSemester] = useState<string>(initialPeriod[1]);
  const [courseId, setCourseId] = useState<string>(editing?.course_id ?? "");
  const [poloIds, setPoloIds] = useState<string[]>(editing?.polo_ids ?? []);

  const years = useMemo(() => Array.from({ length: 31 }, (_, i) => (2020 + i).toString()), []);
  const semesters = [{ value: '1', label: 'Período 1' }, { value: '2', label: 'Período 2' }];

  const validPolosForCourse = useMemo(() => {
    if (!courseId) return [];
    const selectedCourse = courses.find((x) => x.id === courseId);
    if (!selectedCourse) return [];
    return polos.filter((p) => selectedCourse.polo_ids.includes(p.id));
  }, [courseId, courses, polos]);

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Editar Grupo de Turmas" : "Novo Grupo de Turmas"}</DialogTitle></DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const period = `${year}.${semester}`;
          onSubmit({ period, course_id: courseId, polo_ids: poloIds });
        }}
        className="space-y-4"
      >
        <div>
          <Label>Curso</Label>
          <Select value={courseId} onValueChange={setCourseId} disabled={!!editing}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Ano</Label>
            <Select value={year} onValueChange={setYear} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Período</Label>
            <Select value={semester} onValueChange={setSemester} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{semesters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Polos</Label>
          <div className="mt-2 space-y-2 rounded-md border p-3 max-h-48 overflow-auto">
            {validPolosForCourse.length === 0 && <p className="text-xs text-muted-foreground">Nenhum polo disponível para este curso.</p>}
            {validPolosForCourse.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={poloIds.includes(p.id)}
                  onCheckedChange={(checked) => {
                    setPoloIds(prev => checked ? [...prev, p.id] : prev.filter(id => id !== p.id));
                  }}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!courseId || poloIds.length === 0 || pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
