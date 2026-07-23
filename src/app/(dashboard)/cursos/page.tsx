"use client";

import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
    queryKey: ["polos", tenant.active?.institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polos")
        .select("id, name")
        .eq("institution_id", tenant.active!.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Polo[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["courses", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, course_polos(polo_id)")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        polo_ids: (c.course_polos ?? []).map((cp) => cp.polo_id),
      })) as Course[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const save = useMutation({
    mutationFn: async (v: { name: string; code: string; polo_ids: string[] }) => {
      if (!tenant.active) throw new Error("No active institution");
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
      // sync polos
      await supabase.from("course_polos").delete().eq("course_id", courseId!);
      if (v.polo_ids.length) {
        await supabase
          .from("course_polos")
          .insert(v.polo_ids.map((pid) => ({ course_id: courseId!, polo_id: pid })));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["polos"] }); // Invalidate polos in case names change
      setFormOpen(false);
      setEditing(null);
      toast.success("Curso salvo com sucesso.");
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
      <div className="p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Cursos"
        description="Cursos da instituição e seus polos."
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
                  <Plus className="mr-1 h-4 w-4" /> Novo curso
                </Button>
              </DialogTrigger>
              <CourseForm
                key={editing?.id}
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
        <div>
          {/* Mobile View: Cards */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando...</div>
            ) : data.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Nenhum curso cadastrado.</div>
            ) : (
              <div className="space-y-4">
                {data.map((c) => (
                  <div key={c.id} className="rounded-lg border bg-card p-4">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-muted-foreground">Código: {c.code ?? "N/A"}</div>

                    <div className="mt-2 text-sm font-medium">Polos:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.polo_ids.map((pid) => {
                        const p = polos.find((x) => x.id === pid);
                        return p ? (
                          <Badge key={pid} variant="secondary">{p.name}</Badge>
                        ) : null;
                      })}
                      {c.polo_ids.length === 0 && <p className="text-xs text-muted-foreground">Nenhum polo associado.</p>}
                    </div>

                    {canEdit && (
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o curso "{c.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(c.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Polos</TableHead>
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
                      Nenhum curso cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.code ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.polo_ids.map((pid) => {
                            const p = polos.find((x) => x.id === pid);
                            return p ? (
                              <Badge key={pid} variant="secondary">
                                {p.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(c);
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
                                  Tem certeza que deseja excluir o curso "{c.name}"? Esta ação não
                                  pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(c.id)}>
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
        </div>
      </PageBody>
    </>
  );
}

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
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar curso" : "Novo curso"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, code, polo_ids: poloIds });
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="code">Código</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label>Polos onde este curso é oferecido</Label>
          <div className="mt-2 space-y-2 rounded-md border p-3 max-h-48 overflow-auto">
            {polos.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum polo cadastrado ainda.</p>
            )}
            {polos.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={poloIds.includes(p.id)}
                  onCheckedChange={(v) =>
                    setPoloIds((prev) => (v ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!name || pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
