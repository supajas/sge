"use client";

import { useState } from "react";
import { Download, FileText, Table as TableIcon } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Student } from "@/lib/types/students";
import { toast } from "sonner";

interface ExportAlunosDialogProps {
  students: Student[];
  classMap: Map<string, string>;
  onClose: () => void;
}

export function ExportAlunosDialog({
  students,
  classMap,
  onClose,
}: ExportAlunosDialogProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const handleExport = () => {
    if (students.length === 0) {
      toast.error("Não há alunos filtrados para exportar.");
      return;
    }

    let fileData = "";
    let mimeType = "";
    let fileExtension = "";

    if (format === "csv") {
      const headers = ["Matricula", "Nome", "CPF", "Email", "Status", "Turma"];
      const rows = students.map((s) => [
        `"${s.registration}"`,
        `"${s.name}"`,
        `"${s.cpf ?? ""}"`,
        `"${s.email ?? ""}"`,
        `"${s.status}"`,
        `"${classMap.get(s.class_id) ?? ""}"`,
      ]);

      fileData = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
      mimeType = "text/csv;charset=utf-8;";
      fileExtension = "csv";
    } else {
      const dataToExport = students.map((s) => ({
        registration: s.registration,
        name: s.name,
        cpf: s.cpf,
        email: s.email,
        status: s.status,
        class: classMap.get(s.class_id) ?? s.class_id,
      }));

      fileData = JSON.stringify(dataToExport, null, 2);
      mimeType = "application/json;charset=utf-8;";
      fileExtension = "json";
    }

    const blob = new Blob([fileData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `alunos_export_${new Date().toISOString().slice(0, 10)}.${fileExtension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exportação em .${fileExtension.toUpperCase()} concluída!`);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" /> Exportar Alunos
        </DialogTitle>
        <DialogDescription>
          Faça o download dos {students.length} alunos visíveis no filtro atual.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Formato de Exportação</Label>
          <Select value={format} onValueChange={(val) => setFormat(val as "csv" | "json")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-emerald-500" />
                  <span>Planilha CSV (.csv)</span>
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span>Dados JSON (.json)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Baixar Arquivo
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}