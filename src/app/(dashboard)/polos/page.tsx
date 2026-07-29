"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Building2,
  MapPinOff,
  Loader2,
  Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Polo = { id: string; name: string; city: string | null; state: string | null };

export default function PolosPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Polo | null>(null);

  const canEdit = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data = [], isLoading } = useQuery({
    queryKey: ["polos", tenant.active?.institutionId, tenant.active?.isPoloScoped],
    queryFn: async () => {
      let query = supabase.from("polos").select("id, name, city, state");
      if (tenant.active!.isPoloScoped) {
        query = query.in("id", tenant.active!.scopedPoloIds);
      } else {
        query = query.eq("institution_id", tenant.active!.institutionId);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as Polo[];
    },
    enabled: !!tenant.active?.institutionId,
  });

  const save = useMutation({
    mutationFn: async (v: { name: string; city: string; state: string }) => {
      if (!tenant.active) throw new Error("Sem instituição ativa");
      if (editing) {
        const { error } = await supabase.from("polos").update(v).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("polos")
          .insert({ ...v, institution_id: tenant.active.institutionId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polos"] });
      setFormOpen(false);
      setEditing(null);
      setTimeout(() => {
        toast.success(editing ? "Polo atualizado com sucesso." : "Polo cadastrado com sucesso.");
      }, 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polos"] });
      setTimeout(() => toast.success("Polo excluído com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  if (!tenant.active) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const uniqueStates = Array.from(new Set(data.map((p) => p.state).filter(Boolean))).length;

  return (
    <>
      <PageHeader
        title="Polos de Atendimento"
        description="Gerencie as unidades físicas e regionais da sua instituição."
        actions={
          canEdit && (
            <Dialog
              open={formOpen}
              onOpenChange={(o) => {
                setFormOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="shadow-2xs">
                  <Plus className="mr-1.5 h-4 w-4" /> Novo Polo
                </Button>
              </DialogTrigger>
              <PoloForm
                key={editing?.id ?? "new"}
                editing={editing}
                onSubmit={(v) => save.mutate(v)}
                pending={save.isPending}
              />
            </Dialog>
          )
        }
      />
      <PageBody>
        <div className="space-y-6">
          {/* Métricas Rápidas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total de Polos</p>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : data.length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Estados Atendidos</p>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : uniqueStates}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VISÃO MOBILE: CARDS */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : data.length === 0 ? (
              <EmptyPolosState />
            ) : (
              data.map((p) => (
                <Card key={p.id} className="border-border/60 bg-card/80 shadow-2xs">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground text-base tracking-tight">{p.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span>
                            {p.city ? p.city : "Cidade não informada"}
                          </span>
                          {p.state && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 uppercase">
                              {p.state}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs hover:bg-accent"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                        <DeletePoloDialog name={p.name} onConfirm={() => del.mutate(p.id)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* VISÃO DESKTOP: TABELA */}
          <div className="hidden rounded-xl border border-border/60 bg-card/60 shadow-2xs overflow-hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Nome do Polo</TableHead>
                  <TableHead className="font-semibold text-foreground">Cidade</TableHead>
                  <TableHead className="font-semibold text-foreground">UF / Estado</TableHead>
                  {canEdit && <TableHead className="w-28 text-right font-semibold text-foreground">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      {canEdit && <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="py-12">
                      <EmptyPolosState />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((p) => (
                    <TableRow key={p.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                          <span>{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.city ?? "—"}</TableCell>
                      <TableCell>
                        {p.state ? (
                          <Badge variant="secondary" className="font-mono text-[11px] uppercase bg-muted/60">
                            {p.state}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <DeletePoloDialog name={p.name} onConfirm={() => del.mutate(p.id)} isIconOnly />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageBody>
    </>
  );
}

{/* ESTADO VAZIO */}
function EmptyPolosState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
        <MapPinOff className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhum polo cadastrado</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Cadastre os polos e unidades de atendimento para vinculá-los aos cursos e turmas.
      </p>
    </div>
  );
}

{/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
function DeletePoloDialog({
  name,
  onConfirm,
  isIconOnly = false,
}: {
  name: string;
  onConfirm: () => void;
  isIconOnly?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {isIconOnly ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Excluir</span>
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Polo</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o polo <strong className="text-foreground">{name}</strong>? Esta ação não pode ser desfeita e pode afetar as turmas vinculadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir Polo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

{/* FORMULÁRIO */}
function PoloForm({
  editing,
  onSubmit,
  pending,
}: {
  editing: Polo | null;
  onSubmit: (v: { name: string; city: string; state: string }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [city, setCity] = useState(editing?.city ?? "");
  const [state, setState] = useState(editing?.state ?? "");

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Polo" : "Cadastrar Novo Polo"}</DialogTitle>
        <DialogDescription>
          Preencha os dados da unidade física para identificação na plataforma.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, city, state });
        }}
        className="space-y-4 pt-2"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold">
            Nome do Polo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Ex: Polo Central - Campus II"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold">
              Cidade
            </Label>
            <Input
              id="city"
              placeholder="Ex: São Paulo"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-xs font-semibold">
              Estado (UF)
            </Label>
            <Input
              id="state"
              placeholder="SP"
              maxLength={2}
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              className="h-9 uppercase"
            />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button type="submit" disabled={!name.trim() || pending} className="w-full sm:w-auto">
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar Polo"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
