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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { History, Pencil, Trash2 } from "lucide-react";
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

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await removeMembershipAction({ membership_id: id });
    },
    onSuccess: () => {
      toast.success("Colaborador removido");
      // Revalidation is handled by the server action
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description="Pessoas com acesso à instituição."
        actions={
          canAdmin && (
            <Button variant="outline" asChild>
              <Link href="/colaboradores/historico">
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Link>
            </Button>
          )
        }
      />
      <PageBody>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Polos</TableHead>
                {canAdmin && <TableHead className="w-24 text-right"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                data.map((m) => (
                  <TableRow key={m.membershipId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {m.avatar && <AvatarImage src={m.avatar} />}
                          <AvatarFallback>{m.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.polos.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {m.polos.map((p) => (
                            <Badge key={p.id} variant="outline">
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {canAdmin && (
                      <TableCell className="text-right">
                        {m.role !== "owner" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Editar"
                              onClick={() => setEditing(m)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" title="Remover">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover o acesso de {m.name} a esta
                                    instituição?
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
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageBody>

      {editing && (
        <EditMembershipDialog
          key={editing.membershipId}
          row={editing}
          institutionId={tenant.active.institutionId}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </>
  );
}

function EditMembershipDialog({
  row,
  institutionId,
  onClose,
  onSaved,
}: {
  row: Row;
  institutionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<AppRole>(row.role);
  const [selected, setSelected] = useState<string[]>(row.polos.map((p) => p.id));

  const { data: polos = [] } = useQuery({
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

  const save = useMutation({
    mutationFn: async () => {
      await updateMembershipAction({
        membership_id: row.membershipId,
        role: role as "admin" | "coord_geral" | "coord_polo",
        polo_ids: role === "coord_polo" ? selected : [],
      });
    },
    onSuccess: () => {
      toast.success("Colaborador atualizado");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const showPolos = role === "coord_polo";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar colaborador — {row.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="coord_geral">Coordenador Geral</SelectItem>
                <SelectItem value="coord_polo">Coordenador de Polo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showPolos && (
            <div>
              <Label>Polos vinculados</Label>
              <div className="mt-2 max-h-64 space-y-2 overflow-auto rounded-md border p-3">
                {polos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum polo cadastrado ainda.</p>
                ) : (
                  polos.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.includes(p.id)}
                        onCheckedChange={(v) =>
                          setSelected((cur) => (v ? [...cur, p.id] : cur.filter((x) => x !== p.id)))
                        }
                      />
                      {p.name}
                    </label>
                  ))
                )}
              </div>
              {showPolos && selected.length === 0 && (
                <p className="mt-1 text-xs text-destructive">Selecione ao menos um polo.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={save.isPending || (showPolos && selected.length === 0)}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
