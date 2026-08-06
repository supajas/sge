"use client";

import { Student, Status, STATUS_OPTIONS } from "@/lib/types/students";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";
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

interface AlunosCardsProps {
  students: Student[];
  classMap: Map<string, string>;
  isLoading: boolean;
  canEdit: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: Status) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export function AlunosCards({
  students,
  classMap,
  isLoading,
  canEdit,
  updatingId,
  onUpdateStatus,
  onEdit,
  onDelete,
}: AlunosCardsProps) {
  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground md:hidden">Carregando...</div>;
  }

  if (students.length === 0) {
    return <div className="py-8 text-center text-muted-foreground md:hidden">Nenhum aluno encontrado.</div>;
  }

  return (
    <div className="space-y-4 md:hidden">
      {students.map((s) => (
        <div key={s.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{s.name}</span>
            <Select
              value={s.status}
              onValueChange={(val) => onUpdateStatus(s.id, val as Status)}
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
              <span className="font-medium text-foreground">Turma:</span> {classMap.get(s.class_id) ?? "—"}
            </p>
          </div>
          {canEdit && (
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(s)}>
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
                      Tem certeza que deseja excluir o aluno "{s.name}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(s.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
