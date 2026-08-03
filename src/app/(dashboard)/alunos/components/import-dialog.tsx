"use client";

import { useState } from "react";
import { Upload, Loader2, FileSpreadsheet, FileCode, Check, AlertCircle } from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
  classes: Array<{ id: string; label: string }>;
  defaultClassId?: string;
  onImport: (rows: Array<{ name: string; registration: string; cpf?: string; email?: string; class_id: string }>) => void;
  pending: boolean;
}

export function ImportDialog({
  classes,
  defaultClassId,
  onImport,
  pending,
}: ImportDialogProps) {
  const [importType, setImportType] = useState<"csv" | "json">("csv");
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId ?? "");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    if (!selectedClassId) {
      toast.error("Selecione a turma de destino.");
      return;
    }

    if (!fileContent) {
      toast.error("Selecione um arquivo válido para importar.");
      return;
    }

    try {
      let rows: Array<{ name: string; registration: string; cpf?: string; email?: string; class_id: string }> = [];

      if (importType === "csv") {
        const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");
        if (lines.length <= 1) {
          toast.error("O arquivo CSV precisa conter ao menos uma linha de dados.");
          return;
        }

        const separator = lines[0].includes(";") ? ";" : ",";
        rows = lines.slice(1).map((line) => {
          const cols = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
          return {
            registration: cols[0] ?? "",
            name: cols[1] ?? "",
            cpf: cols[2] ?? "",
            email: cols[3] ?? "",
            class_id: selectedClassId,
          };
        }).filter((r) => r.name && r.registration);
      } else {
        const parsed = JSON.parse(fileContent);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        rows = list.map((item: any) => ({
          registration: String(item.registration || item.matricula || ""),
          name: String(item.name || item.nome || ""),
          cpf: item.cpf ? String(item.cpf) : undefined,
          email: item.email ? String(item.email) : undefined,
          class_id: selectedClassId,
        })).filter((r) => r.name && r.registration);
      }

      if (rows.length === 0) {
        toast.error("Nenhum registro válido de aluno com 'matrícula' e 'nome' foi identificado.");
        return;
      }

      onImport(rows);
    } catch (e) {
      toast.error("Falha ao ler a estrutura do arquivo. Verifique a formatação do arquivo enviado.");
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px] overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
      <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-card">
        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
          <Upload className="h-4 w-4 text-primary" />
          Importação em Lote de Alunos
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Envie registros estruturados para cadastrar múltiplos estudantes na turma desejada.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 p-6 bg-card/40">
        {/* Seletor do Formato de Importação (Cards em Grid) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Formato do Arquivo</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setImportType("csv");
                setFileContent(null);
                setFileName("");
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                importType === "csv"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-foreground shadow-2xs"
                  : "border-border/60 bg-background/40 hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold">Planilha CSV</p>
                <p className="text-[10px] text-muted-foreground">Matrícula; Nome; CPF; Email</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportType("json");
                setFileContent(null);
                setFileName("");
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                importType === "json"
                  ? "border-amber-500/50 bg-amber-500/10 text-foreground shadow-2xs"
                  : "border-border/60 bg-background/40 hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold">Objetos JSON</p>
                <p className="text-[10px] text-muted-foreground">Array de objetos em texto</p>
              </div>
            </button>
          </div>
        </div>

        {/* Seleção da Turma de Destino (Com Truncamento Seguro) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Turma de Destino</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full text-xs h-9 bg-background/50 truncate">
              <SelectValue placeholder="Selecione a turma para vincular os alunos" className="truncate" />
            </SelectTrigger>
            <SelectContent className="max-w-[440px]">
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs truncate">
                  <span className="truncate block max-w-[400px]">{c.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dropzone de Upload Elegante */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Upload do Arquivo</Label>
          <label className={cn(
            "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all p-4 text-center",
            fileName
              ? "border-primary/50 bg-primary/5"
              : "border-border/80 bg-background/30 hover:bg-muted/30"
          )}>
            <div className="flex flex-col items-center justify-center">
              <Upload className={cn("h-7 w-7 mb-2 transition-transform", fileName ? "text-primary scale-110" : "text-muted-foreground")} />
              {fileName ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="truncate max-w-[320px]">{fileName}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-foreground">
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Suporta arquivos estritamente formatados em .{importType.toUpperCase()}
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              accept={importType === "csv" ? ".csv" : ".json"}
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button
            size="sm"
            onClick={handleProcessImport}
            disabled={pending || !fileContent || !selectedClassId}
            className="w-full sm:w-auto"
          >
            {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Iniciar Importação
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}