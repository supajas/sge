"use client";

import { useState } from "react";
import { Course, Subject, SubjectInput } from "@/types/subjects";
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
  editing: Subject | null;
  courses: Course[];
  onSubmitSingle: (value: SubjectInput) => void;
  onSubmitBulk: (values: SubjectInput[]) => void;
  pending: boolean;
};

export function SubjectFormDialog({
  editing,
  courses,
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
  const [courseId, setCourseId] = useState<string>(editing?.course_id ?? "");

  // Form Bulk JSON
  const [bulkCourseId, setBulkCourseId] = useState<string>("");
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
        toast.success("Arquivo JSON carregado com sucesso.");
      } catch (err) {
        toast.error("Arquivo JSON inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = () => {
    if (!bulkCourseId) {
      toast.error("Selecione um curso para importar as disciplinas.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      // Mapeia adicionando o course_id selecionado no Select
      const validItems: SubjectInput[] = items.map((item: any) => {
        if (!item.name) {
          throw new Error("O campo 'name' é obrigatório em todas as disciplinas.");
        }
        return {
          name: String(item.name),
          course_id: bulkCourseId,
          workload_hours: item.workload_hours ? Number(item.workload_hours) : null,
        };
      });

      onSubmitBulk(validItems);
    } catch (e: any) {
      toast.error(`Erro no JSON: ${e.message || "Formato inválido"}`);
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
              name,
              workload_hours: workload ? Number(workload) : null,
              course_id: courseId,
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label>Curso</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
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
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Curso</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                  <SelectValue placeholder="Selecione o curso para estas disciplinas..." />
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
