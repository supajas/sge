"use client";

import { useState } from "react";
import type {
  Course,
  Period,
  ExtendedSubject,
  SubjectInput,
} from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  editing: ExtendedSubject | null;
  courses: Course[];
  periods?: Period[];
  defaultCourseId?: string;
  defaultPeriodId?: string;
  onSubmitSingle: (value: SubjectInput) => void;
  onSubmitBulk: (values: SubjectInput[]) => void;
  pending: boolean;
};

export function SubjectFormDialog({
  editing,
  courses,
  periods = [],
  defaultCourseId = "",
  defaultPeriodId = "",
  onSubmitSingle,
  onSubmitBulk,
  pending,
}: Props) {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  // Form Individual
  const [name, setName] = useState(editing?.name ?? "");
  const [workload, setWorkload] = useState<string>(
    editing?.workload_hours?.toString() ?? ""
  );
  const [courseId, setCourseId] = useState<string>(
    editing?.course_id ?? defaultCourseId
  );
  const [periodId, setPeriodId] = useState<string>(
    editing?.period_id ?? defaultPeriodId
  );

  // Form Bulk JSON
  const [bulkCourseId, setBulkCourseId] = useState<string>(defaultCourseId);
  const [bulkPeriodId, setBulkPeriodId] = useState<string>(defaultPeriodId);
  const [jsonText, setJsonText] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        JSON.parse(content); // Valida sintaxe JSON
        setJsonText(content);
        setTimeout(() => toast.success("Arquivo JSON carregado com sucesso."), 0);
      } catch {
        setTimeout(() => toast.error("Arquivo JSON inválido."), 0);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = () => {
    if (!bulkCourseId) {
      setTimeout(() => toast.error("Selecione um curso para importar as disciplinas."), 0);
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      // Mapeia adicionando course_id e period_id selecionados
      const validItems: SubjectInput[] = items.map((item: any) => {
        if (!item.name) {
          throw new Error("O campo 'name' é obrigatório em todas as disciplinas.");
        }
        return {
          name: String(item.name),
          course_id: bulkCourseId,
          period_id: bulkPeriodId || undefined,
          workload_hours: item.workload_hours ? Number(item.workload_hours) : null,
        };
      });

      onSubmitBulk(validItems);
    } catch (e: any) {
      setTimeout(() => toast.error(`Erro no JSON: ${e.message || "Formato inválido"}`), 0);
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar disciplina" : "Nova disciplina"}</DialogTitle>
      </DialogHeader>

      {editing ? (
        /* Formulário de Edição Simples */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitSingle({
              id: editing.id,
              name,
              workload_hours: workload ? Number(workload) : null,
              course_id: courseId,
              period_id: periodId || undefined,
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label>Curso</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Período Letivo</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período..." />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="wl">Carga horária</Label>
            <Input id="wl" type="number" value={workload} onChange={(e) => setWorkload(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!name || !courseId || pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      ) : (
        /* Formulário de Criação com Abas */
        <Tabs value={tab} onValueChange={(v) => setTab(v as "single" | "bulk")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Individual</TabsTrigger>
            <TabsTrigger value="bulk">Importar JSON</TabsTrigger>
          </TabsList>

          {/* ABA 1: Individual */}
          <TabsContent value="single" className="space-y-4 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmitSingle({
                  name,
                  workload_hours: workload ? Number(workload) : null,
                  course_id: courseId,
                  period_id: periodId || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Curso</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o curso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Período Letivo</Label>
                <Select value={periodId} onValueChange={setPeriodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período..." />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="wl">Carga horária</Label>
                <Input id="wl" type="number" value={workload} onChange={(e) => setWorkload(e.target.value)} />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={!name || !courseId || pending}>
                  {pending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* ABA 2: Importar JSON */}
          <TabsContent value="bulk" className="space-y-4 pt-2">
            <div>
              <Label>Curso de Destino</Label>
              <Select value={bulkCourseId} onValueChange={setBulkCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o curso..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Período Letivo de Destino</Label>
              <Select value={bulkPeriodId} onValueChange={setBulkPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Upload de Arquivo JSON</Label>
              <Input className="mt-1" type="file" accept=".json" onChange={handleFileUpload} />
            </div>

            <div>
              <Label>Ou Cole o JSON diretamente</Label>
              <Textarea
                placeholder={`[\n  {\n    "name": "Matemática Aplicada",\n    "workload_hours": 60\n  },\n  {\n    "name": "Algoritmos",\n    "workload_hours": 80\n  }\n]`}
                rows={5}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter>
              <Button onClick={handleBulkSubmit} disabled={!bulkCourseId || !jsonText || pending}>
                {pending ? "Importando..." : "Importar Disciplinas"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      )}
    </DialogContent>
  );
}
