"use client";

import { Check, ChevronRight, Filter, GraduationCap, Building2, BookOpen, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectOption } from "../types";

interface AlunosFilterStepperProps {
  cursoId: string | null;
  poloId: string | null;
  turmaId: string | null;
  cursos: SelectOption[];
  polos: SelectOption[];
  turmas: SelectOption[];
  cursosLoading: boolean;
  polosLoading: boolean;
  turmasLoading: boolean;
  onParamChange: (key: string, value: string | null) => void;
}

export function AlunosFilterStepper({
  cursoId,
  poloId,
  turmaId,
  cursos,
  polos,
  turmas,
  cursosLoading,
  polosLoading,
  turmasLoading,
  onParamChange,
}: AlunosFilterStepperProps) {
  const STEPS = [
    { id: "curso", label: "Curso", completed: !!cursoId, icon: GraduationCap },
    { id: "polo", label: "Polo", completed: !!poloId, icon: Building2 },
    { id: "turma", label: "Turma", completed: !!turmaId, icon: BookOpen },
    { id: "alunos", label: "Listagem de Alunos", completed: false, icon: Users },
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);

  const selects = [
    {
      id: "curso",
      label: "1. Curso",
      value: cursoId,
      onValueChange: (v: string) => onParamChange("cursoId", v),
      options: cursos,
      placeholder: "Selecione um curso",
      disabled: cursosLoading,
      loading: cursosLoading,
    },
    {
      id: "polo",
      label: "2. Polo",
      value: poloId,
      onValueChange: (v: string) => onParamChange("poloId", v),
      options: polos,
      placeholder: cursoId ? "Selecione um polo" : "Escolha um curso primeiro",
      disabled: !cursoId || polosLoading,
      loading: polosLoading,
    },
    {
      id: "turma",
      label: "3. Turma",
      value: turmaId,
      onValueChange: (v: string) => onParamChange("turmaId", v),
      options: turmas,
      placeholder: poloId ? "Selecione uma turma" : "Escolha um polo primeiro",
      disabled: !poloId || turmasLoading,
      loading: turmasLoading,
    },
  ];

  const isFiltered = !!(cursoId || poloId || turmaId);

  return (
    <Card className="border-border/60 bg-card/60 shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Seleção de Contexto</CardTitle>
          </div>
          {isFiltered && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              Filtro Ativo
            </Badge>
          )}
        </div>

        {/* Stepper Visual */}
        <ol className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStepIndex === index;
            const isDone = step.completed;

            return (
              <li key={step.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
                    isDone && "bg-primary/10 text-primary font-medium",
                    isActive && "bg-primary text-primary-foreground font-medium shadow-2xs",
                    !isDone && !isActive && "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                  <span>{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
              </li>
            );
          })}
        </ol>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {selects.map((s) => (
            <div key={s.id} className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{s.label}</Label>
              <Select
                value={s.value ?? ""}
                onValueChange={s.onValueChange}
                disabled={s.disabled}
              >
                <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                  {s.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Carregando...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder={s.placeholder} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {s.options.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {opt.name ?? opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}