"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, Loader2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { Input } from "@/components/ui/input";
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

import { Student, Status, STATUS_OPTIONS } from "@/lib/types/students";
import {
  saveStudentAction,
  deleteStudentAction,
  importStudentsAction,
  updateStudentStatusAction,
} from "./actions";
import { StudentFormDialog } from "@/components/alunos/student-form-dialog";
import { ImportDialog } from "@/components/alunos/import-dialog";
import { ExportAlunosDialog } from "@/components/alunos/export-dialog";

export function AlunosList({ turmaId, canEdit }: { turmaId: string; canEdit: boolean }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-basic-form", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, courses(name), polos(name)")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        label: `${(c.courses as { name: string })?.name ?? ""} · ${c.name} · ${
          (c.polos as { name: string })?.name ?? ""
        }`,
      }));
    },
    enabled: !!tenant.active?.institutionId,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["students", turmaId],
    queryFn: async () => {
      if (!turmaId) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, registration, name, cpf, email, status, class_id")
        .eq("class_id", turmaId)
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!turmaId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: Status }) => {
      setUpdatingId(id);
      await updateStudentStatusAction({ studentId: id, status: newStatus });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", turmaId] });
      toast.success("Status atualizado com sucesso.");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar status: ${e.message}`),
    onSettled: () => setUpdatingId(null),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) => s.name.toLowerCase().includes(q) || s.registration.toLowerCase().includes(q)
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: saveStudentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", turmaId] });
      setFormOpen(false);
      setEditing(null);
      toast.success("Aluno salvo com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: deleteStudentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", turmaId] });
      toast.success("Aluno excluído com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importFn = useMutation({
    mutationFn: importStudentsAction,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["students", turmaId] });
      setImportOpen(false);
      toast.success(`${data?.count ?? 0} alunos importados com sucesso.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c.label])), [classes]);

  return (
    <div
      style={{
        animation: `fadeInUp 0.5s ease-out forwards`,
        opacity: 0,
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <Input
          placeholder="Buscar por nome ou matrícula na turma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="mr-1 h-4 w-4" /> Exportar
              </Button>
            </DialogTrigger>
            <ExportAlunosDialog
              students={filtered}
              classMap={classMap}
              onClose={() => setExportOpen(false)}
            />
          </Dialog>
          {canEdit && (
            <>
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Upload className="mr-1 h-4 w-4" /> Importar
                  </Button>
                </DialogTrigger>
                <ImportDialog
                  classes={classes}
                  defaultClassId={turmaId}
                  onImport={(rows) => importFn.mutate(rows)}
                  pending={importFn.isPending}
                />
              </Dialog>
              <Dialog
                open={formOpen}
                onOpenChange={(o) => {
                  setFormOpen(o);
                  if (!o) setEditing(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Novo aluno
                  </Button>
                </DialogTrigger>
                <StudentFormDialog
                  key={editing?.id}
                  editing={editing}
                  classes={classes}
                  defaultClassId={turmaId}
                  onSubmit={(v) => save.mutate(v)}
                  pending={save.isPending}
                />
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div>
        {/* Mobile View: Cards */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Nenhum aluno encontrado.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((s) => (
                <div key={s.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <Select
                      value={s.status}
                      onValueChange={(val) =>
                        updateStatus.mutate({ id: s.id, newStatus: val as Status })
                      }
                      disabled={updatingId === s.id}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        {updatingId === s.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Matrícula:</span> {s.registration}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Turma:</span>{" "}
                      {classMap.get(s.class_id) ?? "—"}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(s);
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
                              Tem certeza que deseja excluir o aluno "{s.name}"? Esta ação não pode
                              ser desfeita.
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
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                {canEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Nenhum aluno encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.registration}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {classMap.get(s.class_id) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={s.status}
                        onValueChange={(val) =>
                          updateStatus.mutate({ id: s.id, newStatus: val as Status })
                        }
                        disabled={updatingId === s.id}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          {updatingId === s.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
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
                                Tem certeza que deseja excluir o aluno "{s.name}"? Esta ação não
                                pode ser desfeita.
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
      </div>
    </div>
  );
}