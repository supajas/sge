"use client";

import { Student, Status, STATUS_OPTIONS } from "@/lib/types/students";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface AlunosTableProps {
  students: Student[];
  classMap: Map<string, string>;
  isLoading: boolean;
  canEdit: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: Status) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export function AlunosTable({
  students,
  classMap,
  isLoading,
  canEdit,
  updatingId,
  onUpdateStatus,
  onEdit,
  onDelete,
}: AlunosTableProps) {
  return (
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
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 5 : 4} className="py-8 text-center text-muted-foreground">
                Nenhum aluno encontrado.
              </TableCell>
            </TableRow>
          ) : (
            students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.registration}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {classMap.get(s.class_id) ?? "—"}
                </TableCell>
                <TableCell>
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
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(s)}>
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
                            Tem certeza que deseja excluir o aluno "{s.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(s.id)}>Excluir</AlertDialogAction>
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
  );
}