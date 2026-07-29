"use client";

import { useState, ChangeEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Student } from "@/lib/types/students";

const studentSchema = z.object({
  registration: z.string().min(1),
  name: z.string().min(1),
  cpf: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  status: z.enum(["ativo", "trancado", "formado", "evadido", "transferido"]).default("ativo"),
});

const importSchema = z.array(studentSchema);

type Props = {
  classes: { id: string; label: string }[];
  defaultClassId: string;
  onImport: (rows: Array<Omit<Student, "id">>) => void;
  pending: boolean;
};

export function ImportDialog({ classes, defaultClassId, onImport, pending }: Props) {
  const [classId, setClassId] = useState<string>(defaultClassId);
  const [fileContent, setFileContent] = useState<string>("");

  const example = `[
  { "registration": "2025001", "name": "Ana Souza", "cpf": "000.000.000-00", "email": "ana@ex.com", "status": "ativo" },
  { "registration": "2025002", "name": "Bruno Lima" }
]`;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      setFileContent(typeof text === "string" ? text : "");
    };
    reader.readAsText(file);
  };

  function handleImport() {
    try {
      const parsed = JSON.parse(fileContent);
      const validated = importSchema.parse(parsed);

      const rows = validated.map((r) => ({
        ...r,
        class_id: classId,
      }));
      onImport(rows);
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.error(e.errors);
        setTimeout(() => toast.error("Erro de validação no JSON. Verifique o formato e os campos."), 0);
      } else {
        setTimeout(() => toast.error((e as Error).message), 0);
      }
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Importar alunos (JSON)</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>1. Turma de destino</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a turma para onde os alunos serão importados..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>2. Arquivo JSON</Label>
          <Input type="file" accept=".json" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground mt-2">
            O arquivo deve ser um array de objetos. Cada objeto deve conter no mínimo `registration` e `name`.
          </p>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer">Ver modelo do JSON</summary>
          <pre className="mt-2 rounded-md bg-muted p-4 text-muted-foreground whitespace-pre-wrap break-words">
            {example}
          </pre>
        </details>
      </div>
      <DialogFooter>
        <Button onClick={handleImport} disabled={!classId || !fileContent || pending}>
          {pending ? "Importando..." : "Importar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
