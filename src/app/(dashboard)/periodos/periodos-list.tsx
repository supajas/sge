"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PeriodosListProps {
  institutionId?: string;
}

type Period = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export function PeriodosList({ institutionId }: PeriodosListProps) {
  const queryClient = useQueryClient();

  // Estados para Modal de Edição
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined);
  const [editIsActive, setEditIsActive] = useState<boolean>(false);

  // Controle de visibilidade dos Popovers de Data
  const [openStartPopover, setOpenStartPopover] = useState(false);
  const [openEndPopover, setOpenEndPopover] = useState(false);

  // Estado para Modal de Exclusão
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);

  // Busca de períodos do Supabase
  const { data: rawPeriods = [], isLoading } = useQuery<Period[]>({
    queryKey: ["periods-list", institutionId],
    queryFn: async () => {
      let query = supabase
        .from("periods")
        .select("id, name, start_date, end_date, is_active, created_at");

      if (institutionId) {
        query = query.eq("institution_id", institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Ordenação garantida: 1º Vigentes/Ativos no topo | 2º Maior período para o menor (ex: 2026.2 > 2026.1)
  const sortedPeriods = useMemo(() => {
    return [...rawPeriods].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      return b.name.localeCompare(a.name, undefined, { numeric: true });
    });
  }, [rawPeriods]);

  // Mutation: Alternar status ativo
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("periods")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periods-list"] });
      setTimeout(() => {
        toast.success("Status atualizado!");
      }, 0);
    },
    onError: (err: any) => {
      setTimeout(() => {
        toast.error(err?.message || "Erro ao atualizar status.");
      }, 0);
    },
  });

  // Mutation: Editar Período
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingPeriod) return;

      const { error } = await supabase
        .from("periods")
        .update({
          start_date: editStartDate ? format(editStartDate, "yyyy-MM-dd") : null,
          end_date: editEndDate ? format(editEndDate, "yyyy-MM-dd") : null,
          is_active: editIsActive,
        })
        .eq("id", editingPeriod.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periods-list"] });
      setEditingPeriod(null);
      setTimeout(() => {
        toast.success("Período atualizado com sucesso!");
      }, 0);
    },
    onError: (err: any) => {
      setTimeout(() => {
        toast.error(err?.message || "Erro ao salvar alterações.");
      }, 0);
    },
  });

  // Mutation: Excluir Período
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("periods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periods-list"] });
      setDeletingPeriodId(null);
      setTimeout(() => {
        toast.success("Período excluído com sucesso!");
      }, 0);
    },
    onError: (err: any) => {
      setTimeout(() => {
        toast.error(err?.message || "Erro ao excluir o período.");
      }, 0);
    },
  });

  const handleOpenEdit = (period: Period) => {
    setEditingPeriod(period);
    setEditStartDate(period.start_date ? parseISO(period.start_date) : undefined);
    setEditEndDate(period.end_date ? parseISO(period.end_date) : undefined);
    setEditIsActive(period.is_active);
  };

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return "Data não informada";
    try {
      const date = parseISO(dateStr);
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (sortedPeriods.length === 0) {
    return (
      <Card className="border-dashed border-border/80 bg-card/40">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="h-9 w-9 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum período letivo cadastrado
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
            Clique no botão acima para adicionar o primeiro período (Ex: 2026.1).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Container com Scroll suave para acomodar 8, 10, 12+ períodos com facilidade */}
      <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
        {sortedPeriods.map((p) => (
          <Card
            key={p.id}
            className={cn(
              "border-border/60 shadow-2xs transition-all hover:border-primary/20 hover:bg-muted/10",
              p.is_active && "border-primary/30 bg-primary/5"
            )}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">
                    Período {p.name}
                  </span>
                  {p.is_active ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-600/90 hover:bg-emerald-600 shadow-xs">
                      <CheckCircle className="mr-1 h-3 w-3" /> Vigente
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                      <XCircle className="mr-1 h-3 w-3" /> Inativo
                    </Badge>
                  )}
                </div>

                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
                  Vigência: {formatDateDisplay(p.start_date)} — {formatDateDisplay(p.end_date)}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                <div className="flex items-center gap-2 pr-2 border-r border-border/40">
                  <span className="text-[11px] text-muted-foreground">Status:</span>
                  <Switch
                    checked={p.is_active}
                    disabled={toggleStatusMutation.isPending}
                    onCheckedChange={(checked) =>
                      toggleStatusMutation.mutate({ id: p.id, is_active: checked })
                    }
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeletingPeriodId(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={!!editingPeriod} onOpenChange={(open) => !open && setEditingPeriod(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Período {editingPeriod?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* DATA INICIAL */}
              <div className="space-y-1.5">
                <Label>Data Inicial</Label>
                <Popover open={openStartPopover} onOpenChange={setOpenStartPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 text-xs justify-start text-left font-normal",
                        !editStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {editStartDate ? format(editStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editStartDate}
                      onSelect={(date) => {
                        setEditStartDate(date);
                        setOpenStartPopover(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* DATA FINAL */}
              <div className="space-y-1.5">
                <Label>Data Final</Label>
                <Popover open={openEndPopover} onOpenChange={setOpenEndPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 text-xs justify-start text-left font-normal",
                        !editEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {editEndDate ? format(editEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Término"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editEndDate}
                      onSelect={(date) => {
                        setEditEndDate(date);
                        setOpenEndPopover(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/30">
              <Label className="text-xs font-medium">Período Ativo / Vigente</Label>
              <Switch
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPeriod(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="text-xs"
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!deletingPeriodId} onOpenChange={(open) => !open && setDeletingPeriodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir período letivo?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta ação não poderá ser desfeita. Turmas ou registros vinculados a este período podem ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
              onClick={(e) => {
                e.preventDefault();
                if (deletingPeriodId) {
                  deleteMutation.mutate(deletingPeriodId);
                }
              }}
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
