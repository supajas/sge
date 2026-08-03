"use client";

import {
  Library,
  Calendar,
  Filter,
  Loader2,
  GraduationCap,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DisciplinasContextSelectorProps } from "../types";

export function DisciplinasContextSelector({
  cursoId,
  periodoId,
  courses,
  periods,
  coursesLoading,
  periodsLoading,
  isFiltered,
  onParamChange,
}: DisciplinasContextSelectorProps) {
  const STEPS = [
    { id: "curso", label: "Curso", completed: !!cursoId, icon: GraduationCap },
    { id: "periodo", label: "Período", completed: !!periodoId, icon: Calendar },
    { id: "disciplinas", label: "Listagem", completed: false, icon: Library },
  ];

  const currentStepIndex = STEPS.findIndex((s) => !s.completed);

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
        <div className="grid gap-4 md:grid-cols-2">
          {/* 1. Curso */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">1. Curso</Label>
            <Select
              value={cursoId ?? ""}
              onValueChange={(v) => onParamChange("cursoId", v)}
              disabled={coursesLoading}
            >
              <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                {coursesLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Selecione um curso" />
                )}
              </SelectTrigger>
              <SelectContent>
                {courses.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Período Letivo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">2. Período Letivo</Label>
            <Select
              value={periodoId ?? ""}
              onValueChange={(v) => onParamChange("periodoId", v)}
              disabled={!cursoId || periodsLoading}
            >
              <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                {periodsLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <SelectValue
                    placeholder={
                      !cursoId ? "Escolha um curso primeiro" : "Selecione um período"
                    }
                  />
                )}
              </SelectTrigger>
              <SelectContent>
                {periods.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.name} {opt.is_active ? "(Ativo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}