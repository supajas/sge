"use client";

import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Student, ColumnKey, EXPORT_COLUMNS, STATUS_OPTIONS } from "./types";

interface ExportAlunosDialogProps {
  students: Student[];
  classMap: Map<string, string>;
  onClose: () => void;
}

export function ExportAlunosDialog({ students, classMap, onClose }: ExportAlunosDialogProps) {
  const [selectedCols, setSelectedCols] = useState<Record<ColumnKey, boolean>>({
    registration: true,
    name: true,
    turma: true,
    status: true,
  });

  const allSelected = useMemo(
    () => Object.values(selectedCols).every(Boolean),
    [selectedCols]
  );

  const toggleAll = (checked: boolean) => {
    setSelectedCols({
      registration: checked,
      name: checked,
      turma: checked,
      status: checked,
    });
  };

  const handleExport = () => {
    const activeCols = EXPORT_COLUMNS.filter((col) => selectedCols[col.key]);

    if (activeCols.length === 0) {
      toast.error("Selecione ao menos uma coluna para exportar.");
      return;
    }

    const headers = activeCols.map((c) => c.label).join(";");
    const rows = students.map((student) =>
      activeCols
        .map((col) => {
          let val = "";
          if (col.key === "registration") val = student.registration;
          if (col.key === "name") val = student.name;
          if (col.key === "turma") val = classMap.get(student.class_id) ?? "";
          if (col.key === "status") {
            val = STATUS_OPTIONS.find((s) => s.value === student.status)?.label ?? student.status;
          }
          return `"${(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(";")
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `alunos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Exportação realizada com sucesso!");
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Exportar Alunos</DialogTitle>
        <DialogDescription>
          Selecione as colunas desejadas para gerar o relatório CSV.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-3">
        <div className="flex items-center space-x-2 border-b pb-3">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={(v) => toggleAll(!!v)}
          />
          <Label htmlFor="select-all" className="font-semibold cursor-pointer">
            Selecionar Todas
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {EXPORT_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${col.key}`}
                checked={selectedCols[col.key]}
                onCheckedChange={(v) =>
                  setSelectedCols((prev) => ({ ...prev, [col.key]: !!v }))
                }
              />
              <Label htmlFor={`col-${col.key}`} className="cursor-pointer">
                {col.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleExport} disabled={students.length === 0}>
          <Download className="mr-1 h-4 w-4" /> Exportar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
