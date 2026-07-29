"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileCode } from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Student, ColumnKey, EXPORT_COLUMNS, STATUS_OPTIONS } from "@/lib/types/students";

interface ExportAlunosDialogProps {
  students: Student[];
  classMap: Map<string, string>;
  onClose: () => void;
}

export function ExportAlunosDialog({ students, classMap, onClose }: ExportAlunosDialogProps) {
  const [selectedCols, setSelectedCols] = useState<ColumnKey[]>(EXPORT_COLUMNS.map(c => c.key));
  const [format, setFormat] = useState<"excel" | "pdf" | "json">("excel");

  const toggleColumn = (colKey: ColumnKey) => {
    setSelectedCols((prev) =>
      prev.includes(colKey) ? prev.filter((key) => key !== colKey) : [...prev, colKey]
    );
  };

  const toggleAll = () => {
    if (selectedCols.length === EXPORT_COLUMNS.length) {
      setSelectedCols([]);
    } else {
      setSelectedCols(EXPORT_COLUMNS.map((c) => c.key));
    }
  };

  const handleExport = async () => {
    if (selectedCols.length === 0) {
      setTimeout(() => toast.error("Selecione ao menos uma coluna para exportar."), 0);
      return;
    }

    const activeCols = EXPORT_COLUMNS.filter((c) => selectedCols.includes(c.key));
    const filename = `alunos_${new Date().toISOString().slice(0, 10)}`;

    // Helper to get formatted value
    const getVal = (student: Student, key: ColumnKey) => {
        switch (key) {
            case "registration": return student.registration;
            case "name": return student.name;
            case "turma": return classMap.get(student.class_id) ?? "—";
            case "status": return STATUS_OPTIONS.find(s => s.value === student.status)?.label ?? student.status;
            default: return "";
        }
    }

    // Data for Excel/JSON
    const exportData = students.map(student => {
        const row: Record<string, string> = {};
        activeCols.forEach(col => {
            row[col.label] = getVal(student, col.key);
        });
        return row;
    });

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Alunos");
      worksheet.columns = activeCols.map((col) => ({ header: col.label, key: col.label, width: 25 }));
      exportData.forEach((row) => worksheet.addRow(row));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setTimeout(() => toast.success("Arquivo Excel gerado!"), 0);
    } else if (format === "json") {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const a = document.createElement("a");
      a.href = jsonString;
      a.download = `${filename}.json`;
      a.click();
      setTimeout(() => toast.success("Arquivo JSON gerado!"), 0);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Relatório de Alunos", 14, 15);
      const tableHeaders = activeCols.map((c) => c.label);
      const tableRows = students.map(student => activeCols.map(col => getVal(student, col.key)));
      autoTable(doc, { head: [tableHeaders], body: tableRows, startY: 28, styles: { fontSize: 8 } });
      doc.save(`${filename}.pdf`);
      setTimeout(() => toast.success("Arquivo PDF gerado!"), 0);
    }

    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Exportar Alunos</DialogTitle>
        <DialogDescription>
          Escolha os campos e o formato desejado para salvar o relatório.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Formato</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)} className="grid grid-cols-3 gap-2">
            <div>
              <RadioGroupItem value="excel" id="excel" className="peer sr-only" />
              <Label htmlFor="excel" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-xs">
                <FileSpreadsheet className="mb-2 h-5 w-5 text-emerald-600" />
                Excel (.xlsx)
              </Label>
            </div>
            <div>
              <RadioGroupItem value="pdf" id="pdf" className="peer sr-only" />
              <Label htmlFor="pdf" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-xs">
                <FileText className="mb-2 h-5 w-5 text-red-600" />
                PDF (.pdf)
              </Label>
            </div>
            <div>
              <RadioGroupItem value="json" id="json" className="peer sr-only" />
              <Label htmlFor="json" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-xs">
                <FileCode className="mb-2 h-5 w-5 text-amber-600" />
                JSON (.json)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Colunas</Label>
            <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={toggleAll}>
              {selectedCols.length === EXPORT_COLUMNS.length ? "Desmarcar todas" : "Marcar todas"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
            {EXPORT_COLUMNS.map((col) => (
              <div key={col.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${col.key}`}
                  checked={selectedCols.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <Label htmlFor={`col-${col.key}`} className="text-xs font-normal cursor-pointer">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
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
