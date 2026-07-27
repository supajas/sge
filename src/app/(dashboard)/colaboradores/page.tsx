"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  History,
  Pencil,
  Trash2,
  Users,
  Search,
  Loader2,
  ShieldAlert,
  Building2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
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
import { updateMembershipAction, removeMembershipAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Row = {
  membershipId: string;
  userId: string;
  role: AppRole;
  name: string;
  email: string;
  avatar: string | null;
  lastSignIn: string | null;
  polos: { id: string; name: string }[];
};

export default function ColaboradoresPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canAdmin = tenant.active ? isAdminLike(tenant.active.role) : false;

  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ["memberships-list", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("memberships")
        .select(
          "id, role, user_id, profiles!inner(full_name, email, avatar_url, last_sign_in_at), coordinator_polos(polo_id, polos(id, name))"
        )
        .eq("institution_id", tenant.active.institutionId);
      if (error) throw error;
      return (data ?? []).map((m) => {
        const p = m.profiles as {
          full_name: string;
          email: string;
          avatar_url: string | null;
          last_sign_in_at: string | null;
        };
        const cps = (m.coordinator_polos ?? []) as { polos: { id: string; name: string } | null }[];
        return {
          membershipId: m.id,
          userId: m.user_id,
          role: m.role as AppRole,
          name: p.full_name,
          email: p.email,
          avatar: p.avatar_url,
          lastSignIn: p.last_sign_in_at,
          polos: cps.map((c) => c.polos).filter((x): x is { id: string; name: string } => !!x),
        };
      });
    },
    enabled: !!tenant.active?.institutionId,
  });

  const save = useMutation({
    mutationFn: updateMembershipAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships-list"] });
      toast.success("Colaborador atualizado com sucesso");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await removeMembershipAction({ membership_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships-list"] });
      toast.success("Colaborador removido com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tenant.active) {
    return <ColaboradoresSkeleton />;
  }

  const filteredData = data.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca acessou";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description="Gerencie os usuários e seus respectivos níveis de permissão dentro da instituição."
        actions={
          canAdmin && (
            <Button variant="outline" size="sm" asChild className="text-xs shadow-2xs">
              <Link href="/colaboradores/historico">
                <History className="mr-1.5 h-3.5 w-3.5" />
                Histórico de Alterações
              </Link>
            </Button>
          )
        }
      />
      <PageBody>
        <Card className="border-border/60 bg-card/60 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Membros da Equipe ({data.length})
                </CardTitle>
              </div>

              {/* Busca rápida */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-8 h-8 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Visão Mobile: Lista de Cards */}
            <div className="block md:hidden divide-y divide-border/40">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum colaborador encontrado.
                </div>
              ) : (
                filteredData.map((m) => (
                  <div key={m.membershipId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/60">
                          {m.avatar && <AvatarImage src={m.avatar} alt={m.name} />}
                          <AvatarFallback className="text-xs font-semibold">
                            {m.name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none text-foreground">
                            {m.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{m.email}</p>
                        </div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(m.role)} className="text-[10px] capitalize">
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    </div>

                    {/* Informações adicionais */}
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>Acesso: {formatDate(m.lastSignIn)}</span>
                      </div>

                      {m.polos.length > 0 && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <Building2 className="h-3 w-3 mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {m.polos.map((p) => (
                              <Badge key={p.id} variant="outline" className="text-[10px] py-0 px-1.5">
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    {canAdmin && m.role !== "owner" && (
                      <div className="pt-2 flex justify-end gap-2 border-t border-border/30">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(m)}
                          className="h-7 text-xs"
                        >
                          <Pencil className="mr-1.5 h-3 w-3" /> Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 text-xs">
                              <Trash2 className="mr-1.5 h-3 w-3" /> Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o acesso de <strong>{m.name}</strong> a esta instituição?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(m.membershipId)}>
                                Confirmar Remoção
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Visão Desktop: Tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="text-xs">Colaborador</TableHead>
                    <TableHead className="text-xs">Perfil / Função</TableHead>
                    <TableHead className="text-xs">Polos Vinculados</TableHead>
                    <TableHead className="text-xs">Último Acesso</TableHead>
                    {canAdmin && <TableHead className="w-20 text-right text-xs">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Carregando colaboradores...
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                        Nenhum colaborador encontrado para a busca especificada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((m) => (
                      <TableRow key={m.membershipId} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border/60">
                              {m.avatar && <AvatarImage src={m.avatar} alt={m.name} />}
                              <AvatarFallback className="text-xs font-semibold">
                                {m.name?.[0]?.toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground">{m.name}</span>
                              <span className="text-[11px] text-muted-foreground">{m.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(m.role)} className="text-[11px] font-normal">
                            {ROLE_LABELS[m.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {m.polos.length === 0 ? (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {m.polos.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[10px] py-0">
                                  {p.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(m.lastSignIn)}
                        </TableCell>
                        {canAdmin && (
                          <TableCell className="text-right">
                            {m.role !== "owner" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Editar permissões"
                                  onClick={() => setEditing(m)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      title="Remover colaborador"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja remover o acesso de <strong>{m.name}</strong> a esta instituição?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => remove.mutate(m.membershipId)}>
                                        Remover
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </PageBody>

      {/* Modal de Edição */}
      {editing && (
        <EditMembershipDialog
          key={editing.membershipId}
          row={editing}
          institutionId={tenant.active.institutionId}
          onClose={() => setEditing(null)}
          onSave={save.mutate}
          isSaving={save.isPending}
        />
      )}
    </>
  );
}

// Modal Refatorado para Edição de Membro
function EditMembershipDialog({
  row,
  institutionId,
  onClose,
  onSave,
  isSaving,
}: {
  row: Row;
  institutionId: string;
  onClose: () => void;
  onSave: (vars: { membership_id: string; role: AppRole; polo_ids: string[] }) => void;
  isSaving: boolean;
}) {
  const [role, setRole] = useState<AppRole>(row.role);
  const [selected, setSelected] = useState<string[]>(row.polos.map((p) => p.id));

  const { data: polos = [], isLoading: polosLoading } = useQuery({
    queryKey: ["polos-all", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polos")
        .select("id, name")
        .eq("institution_id", institutionId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const showPolos = role === "coord_polo";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Editar Perfil do Colaborador</DialogTitle>
          <DialogDescription className="text-xs">
            Altere as permissões de acesso e o perfil de <strong>{row.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Perfil de Acesso</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                <SelectItem value="coord_geral" className="text-xs">Coordenador Geral</SelectItem>
                <SelectItem value="coord_polo" className="text-xs">Coordenador de Polo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showPolos && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Polos Vinculados</Label>
                <span className="text-[10px] text-muted-foreground">
                  {selected.length} selecionado(s)
                </span>
              </div>
              
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-background/50 p-3">
                {polosLoading ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando polos...
                  </div>
                ) : polos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum polo cadastrado na instituição.
                  </p>
                ) : (
                  polos.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs font-normal cursor-pointer select-none">
                      <Checkbox
                        checked={selected.includes(p.id)}
                        onCheckedChange={(v) =>
                          setSelected((cur) => (v ? [...cur, p.id] : cur.filter((x) => x !== p.id)))
                        }
                      />
                      <span className="text-foreground">{p.name}</span>
                    </label>
                  ))
                )}
              </div>

              {selected.length === 0 && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Coordenadores de Polo precisam ter ao menos um polo selecionado.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={isSaving || (showPolos && selected.length === 0)}
            onClick={() =>
              onSave({
                membership_id: row.membershipId,
                role: role,
                polo_ids: showPolos ? selected : [],
              })
            }
            className="text-xs"
          >
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Skeleton para carregamento inicial
function ColaboradoresSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
