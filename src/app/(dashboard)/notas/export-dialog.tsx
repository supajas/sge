"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileCode } from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export type ExportColumn = {
  id: string;
  label: string;
};

type ExportDialogProps = {
  columns: ExportColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  filename?: string;
  title?: string;
};

export function ExportDialog({
  columns,
  data,
  filename = "relatorio_notas",
  title = "Relatório de Notas",
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCols, setSelectedCols] = useState<string[]>(
    columns.map((c) => c.id)
  );
  const [format, setFormat] = useState<"excel" | "pdf" | "json">("excel");

  const toggleColumn = (colId: string) => {
    setSelectedCols((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const toggleAll = () => {
    if (selectedCols.length === columns.length) {
      setSelectedCols([]);
    } else {
      setSelectedCols(columns.map((c) => c.id));
    }
  };

  const handleExport = async () => {
    if (selectedCols.length === 0) {
      toast.error("Selecione ao menos uma coluna para exportar.");
      return;
    }

    const activeColumns = columns.filter((c) => selectedCols.includes(c.id));

    const exportData = data.map((row) => {
      const filteredRow: Record<string, string | number | null> = {};
      activeColumns.forEach((col) => {
        filteredRow[col.label] = row[col.id] ?? "—";
      });
      return filteredRow;
    });

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Notas");

      worksheet.columns = activeColumns.map((col) => ({
        header: col.label,
        key: col.label,
        width: 22,
      }));

      exportData.forEach((row) => worksheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${filename}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast.success("Arquivo Excel gerado com sucesso!");
    } else if (format === "json") {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `${filename}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success("Arquivo JSON gerado com sucesso!");
    } else if (format === "pdf") {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 22);

      const tableHeaders = activeColumns.map((c) => c.label);
      const tableRows = data.map((row) =>
        activeColumns.map((col) => String(row[col.id] ?? "—"))
      );

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`${filename}.pdf`);
      toast.success("Arquivo PDF gerado com sucesso!");
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Download className="mr-2 h-4 w-4" /> Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar dados</DialogTitle>
          <DialogDescription>
            Escolha os campos e o formato desejado para salvar o relatório.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Seleção do Formato */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Formato de Saída
            </Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "excel" | "pdf" | "json")}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="excel" id="excel" className="peer sr-only" />
                <Label
                  htmlFor="excel"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="mb-2 h-5 w-5 text-emerald-600" />
                  Excel (.xlsx)
                </Label>
              </div>

              <div>
                <RadioGroupItem value="pdf" id="pdf" className="peer sr-only" />
                <Label
                  htmlFor="pdf"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
                >
                  <FileText className="mb-2 h-5 w-5 text-red-600" />
                  PDF (.pdf)
                </Label>
              </div>

              <div>
                <RadioGroupItem value="json" id="json" className="peer sr-only" />
                <Label
                  htmlFor="json"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
                >
                  <FileCode className="mb-2 h-5 w-5 text-amber-600" />
                  JSON (.json)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Seleção de Colunas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Colunas a incluir
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={toggleAll}
              >
                {selectedCols.length === columns.length
                  ? "Desmarcar todas"
                  : "Marcar todas"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
              {columns.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${col.id}`}
                    checked={selectedCols.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  <Label
                    htmlFor={`col-${col.id}`}
                    className="text-xs font-normal cursor-pointer truncate"
                  >
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport}>Baixar arquivo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
