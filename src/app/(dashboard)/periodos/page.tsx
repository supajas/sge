"use client";

import { Suspense, useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldAlert, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PeriodosList } from "./periodos-list";

function PeriodosPageContent() {
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);

  // Estados do Formulário
  const [selectedName, setSelectedName] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isActive, setIsActive] = useState(false);

  // Estados de Controle dos Popovers de Data
  const [openStartDatePopover, setOpenStartDatePopover] = useState(false);
  const [openEndDatePopover, setOpenEndDatePopover] = useState(false);

  // Restrição: Apenas Owner e Admin
  const isOwnerOrAdmin =
    tenant.active?.role === "owner" || tenant.active?.role === "admin";

  // ✅ Dinâmico (3 anos atrás até 10 anos no futuro):
  const periodOptions = useMemo(() => {
  const currentYear = new Date().getFullYear(); // 2026
  const startYear = currentYear - 3; // 2023
  const endYear = currentYear + 9;   // 2035

  const options: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
        options.push(`${y}.1`);
        options.push(`${y}.2`);
  }
  return options;
}, []);

  const resetForm = () => {
  setSelectedName("");
  setStartDate(undefined);
  setEndDate(undefined);
  setIsActive(false); // <-- Mude de true para false aqui também
  setOpenStartDatePopover(false);
  setOpenEndDatePopover(false);
};

  // Preenche sugestões de data ao escolher o período (ex: 2026.1 -> Jan/2026 a Jun/2026)
  const handleSelectPeriod = (val: string) => {
    setSelectedName(val);
    const [yearStr, semesterStr] = val.split(".");
    const year = parseInt(yearStr, 10);
    if (semesterStr === "1") {
      setStartDate(new Date(year, 0, 15)); // Jan 15
      setEndDate(new Date(year, 5, 30));   // Jun 30
    } else if (semesterStr === "2") {
      setStartDate(new Date(year, 6, 15)); // Jul 15
      setEndDate(new Date(year, 11, 20));  // Dec 20
    }
  };

    // Mutation para criar período letivo
    const createMutation = useMutation({
      mutationFn: async () => {
        if (!tenant.active?.institutionId) throw new Error("Instituição não selecionada.");
        if (!selectedName) throw new Error("Selecione o nome do período.");

        const { error } = await supabase.from("periods").insert({
          institution_id: tenant.active.institutionId,
          name: selectedName,
          start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          is_active: isActive,
        });

        if (error) throw error;
      },
      onSuccess: () => {
        setOpenModal(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["periods-list"] });
        
        // setTimeout garante que o Toast só renderiza após o modal fechar completamente
        setTimeout(() => {
          toast.success("Período letivo criado com sucesso!");
        }, 0);
      },
      onError: (err: any) => {
        setTimeout(() => {
          toast.error(err?.message || "Erro ao criar período letivo.");
        }, 0);
      },
    });

  if (!isOwnerOrAdmin) {
    return (
      <PageBody>
        <Card className="border-dashed border-destructive/50 bg-destructive/5 my-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              Acesso Restrito
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md">
              Esta página de gerenciamento de períodos letivos é restrita a administradores do sistema.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    );
  }

  return (
    <>
      <PageHeader
        title="Períodos Letivos"
        description="Gerencie os períodos e calendários letivos globais da instituição."
        actions={
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs shadow-2xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo Período
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" /> Cadastrar Período Letivo
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4 py-2 text-xs"
              >
                {/* Seleção rápida de nome do período */}
                <div className="space-y-1.5">
                  <Label htmlFor="period-select">Identificação do Período *</Label>
                  <Select value={selectedName} onValueChange={handleSelectPeriod}>
                    <SelectTrigger id="period-select" className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o período (Ex: 2026.1)" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          Período {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seleção de Datas sem digitação manual */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Data Inicial */}
                  <div className="space-y-1.5">
                    <Label>Data Inicial</Label>
                    <Popover open={openStartDatePopover} onOpenChange={setOpenStartDatePopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-9 text-xs justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date);
                            setOpenStartDatePopover(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Data Final */}
                  <div className="space-y-1.5">
                    <Label>Data Final</Label>
                    <Popover open={openEndDatePopover} onOpenChange={setOpenEndDatePopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-9 text-xs justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Término"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => {
                            setEndDate(date);
                            setOpenEndDatePopover(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Período Ativo / Vigente</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Marque se este período é a vigência letiva padrão.
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setOpenModal(false);
                    }}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createMutation.isPending || !selectedName}
                    className="text-xs"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    )}
                    Salvar Período
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <PageBody>
        <PeriodosList institutionId={tenant.active?.institutionId} />
      </PageBody>
    </>
  );
}

function PeriodosPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function PeriodosPageWrapper() {
  return (
    <Suspense fallback={<PeriodosPageSkeleton />}>
      <PeriodosPageContent />
    </Suspense>
  );
}
