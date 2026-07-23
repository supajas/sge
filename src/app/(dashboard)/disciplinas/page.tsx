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

type Subject = { id: string; name: string; workload_hours: number | null; course_id: string };
type Course = { id: string; name: string };

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

  const save = useMutation({
    mutationFn: async (v: { name: string; workload_hours: number | null; course_id: string }) => {
      if (!tenant.active) throw new Error("No active institution");
      const payload = { ...v, institution_id: tenant.active.institutionId };
      if (editing) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Disciplina salva com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Disciplina excluída com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Disciplinas"
        description="Disciplinas por curso."
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
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Nova disciplina
                </Button>
              </DialogTrigger>
              <SubjectForm
                key={editing?.id}
                editing={editing}
                courses={courses}
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
                <TableHead>Nome</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Carga horária</TableHead>
                {canEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhuma disciplina cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{courseMap.get(s.course_id) ?? "—"}</TableCell>
                    <TableCell>{s.workload_hours ?? "—"}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a disciplina "{s.name}"? Esta ação
                                não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(s.id)}>
                                Excluir
                              </AlertDialogAction>
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

function SubjectForm({
  editing,
  courses,
  onSubmit,
  pending,
}: {
  editing: Subject | null;
  courses: Course[];
  onSubmit: (v: { name: string; workload_hours: number | null; course_id: string }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [workload, setWorkload] = useState<string>(editing?.workload_hours?.toString() ?? "");
  const [courseId, setCourseId] = useState<string>(editing?.course_id ?? "");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar disciplina" : "Nova disciplina"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, workload_hours: workload ? Number(workload) : null, course_id: courseId });
        }}
        className="space-y-4"
      >
        <div>
          <Label>Curso</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
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
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="wl">Carga horária</Label>
          <Input id="wl" type="number" value={workload} onChange={(e) => setWorkload(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!name || !courseId || pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
