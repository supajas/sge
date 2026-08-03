"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Download } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

import { Student, Status } from "@/lib/types/students";
import {
  saveStudentAction,
  deleteStudentAction,
  importStudentsAction,
  updateStudentStatusAction,
} from "./actions";
import { StudentFormDialog } from "./components/student-form-dialog";
import { ImportDialog } from "./components/import-dialog";
import { ExportAlunosDialog } from "./components/export-dialog";
import { AlunosTable } from "./components/alunos-table";
import { AlunosCards } from "./components/alunos-cards";

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
      setTimeout(() => toast.success("Status atualizado com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(`Erro ao atualizar status: ${e.message}`), 0),
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
      setTimeout(() => toast.success("Aluno salvo com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const del = useMutation({
    mutationFn: deleteStudentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", turmaId] });
      setTimeout(() => toast.success("Aluno excluído com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const importFn = useMutation({
    mutationFn: importStudentsAction,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["students", turmaId] });
      setImportOpen(false);
      setTimeout(() => toast.success(`${data?.count ?? 0} alunos importados com sucesso.`), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
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
        <AlunosCards
          students={filtered}
          classMap={classMap}
          isLoading={isLoading}
          canEdit={canEdit}
          updatingId={updatingId}
          onUpdateStatus={(id, status) => updateStatus.mutate({ id, newStatus: status })}
          onEdit={(student) => {
            setEditing(student);
            setFormOpen(true);
          }}
          onDelete={(id) => del.mutate(id)}
        />
        <AlunosTable
          students={filtered}
          classMap={classMap}
          isLoading={isLoading}
          canEdit={canEdit}
          updatingId={updatingId}
          onUpdateStatus={(id, status) => updateStatus.mutate({ id, newStatus: status })}
          onEdit={(student) => {
            setEditing(student);
            setFormOpen(true);
          }}
          onDelete={(id) => del.mutate(id)}
        />
      </div>
    </div>
  );
}