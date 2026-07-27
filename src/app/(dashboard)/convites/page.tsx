"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, MessageCircle, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { toast } from "sonner";
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
import { createInviteAction, updateInviteAction } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";

type Invite = ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchInvites>>>>["data"][0];

async function fetchInvites(institutionId: string) {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

function getInviteLink(code: string) {
  return `${window.location.origin}/invite/${code}`;
}

function copyInviteLink(code: string) {
  navigator.clipboard.writeText(getInviteLink(code));
  toast.success("Link copiado");
}

function shareWhatsApp(code: string, institutionName?: string) {
  const msg = `Você foi convidado para ${institutionName ?? "a plataforma"}. Aceite: ${getInviteLink(code)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

export default function ConvitesPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["invites", tenant.active?.institutionId],
    queryFn: () => fetchInvites(tenant.active!.institutionId),
    enabled: !!tenant.active?.institutionId,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: {
      id: string;
      email: string;
      role: AppRole | "none";
      expires_in_days: number;
      polo_ids: string[];
    }) => {
      if (!tenant.active) throw new Error("No active institution");
      return updateInviteAction({
        id: v.id,
        institution_id: tenant.active.institutionId,
        email: v.email || null,
        role: v.role === "none" ? null : (v.role as "admin" | "coord_geral" | "coord_polo"),
        expires_in_days: v.expires_in_days,
        polo_ids: v.polo_ids,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setEditingInvite(null);
      toast.success("Convite atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async (v: {
      email: string;
      role: AppRole | "none";
      expires_in_days: number;
      polo_ids: string[];
    }) => {
      if (!tenant.active) throw new Error("No active institution");
      return createInviteAction({
        institution_id: tenant.active.institutionId,
        email: v.email || null,
        role: v.role === "none" ? null : (v.role as "admin" | "coord_geral" | "coord_polo"),
        expires_in_days: v.expires_in_days,
        single_use: true,
        polo_ids: v.polo_ids,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setCreateOpen(false);
      toast.success("Convite criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Convites"
        description="Convide colaboradores por email, link ou WhatsApp."
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Novo convite
              </Button>
            </DialogTrigger>
            <InviteForm 
              onSubmit={(v) => create.mutate(v)} 
              pending={create.isPending} 
            />
          </Dialog>
        }
      />

      <Dialog open={!!editingInvite} onOpenChange={(open) => !open && setEditingInvite(null)}>
        {editingInvite && (
          <InviteForm
            key={editingInvite.id}
            initialData={{
              email: editingInvite.email ?? "",
              role: (editingInvite.role as AppRole) ?? "none",
              expires_in_days: Math.max(1, Math.ceil((new Date(editingInvite.expires_at).getTime() - Date.now()) / 86400_000)),
              polo_ids: editingInvite.polo_ids ?? [],
            }}
            onSubmit={(v) => update.mutate({ ...v, id: editingInvite.id })}
            pending={update.isPending}
            isEditing
          />
        )}
      </Dialog>

      <PageBody>
        <div>
          {/* Mobile View: Cards */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando...</div>
            ) : data.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Nenhum convite ainda.</div>
            ) : (
              <div className="space-y-4">
                {data.map((i) => {
                  const expired = new Date(i.expires_at).getTime() < Date.now();
                  const used = !!i.used_at;
                  const active = !expired && !used;

                  return (
                    <div key={i.id} className="rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="font-mono text-sm">{i.code}</div>
                        <InviteStatusBadge used={used} expired={expired} />
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p><span className="font-medium text-foreground">Email:</span> {i.email ?? "Qualquer um"}</p>
                        <p><span className="font-medium text-foreground">Perfil:</span> {i.role ? ROLE_LABELS[i.role as AppRole] : "A escolher"}</p>
                        <p><span className="font-medium text-foreground">Expira:</span> {new Date(i.expires_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <InviteActions
                          invite={i}
                          active={active}
                          tenantName={tenant.active?.name}
                          onEdit={() => setEditingInvite(i)}
                          onDelete={() => del.mutate(i.id)}
                          iconOnly={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum convite ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((i) => {
                    const expired = new Date(i.expires_at).getTime() < Date.now();
                    const used = !!i.used_at;
                    const active = !expired && !used;

                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.code}</TableCell>
                        <TableCell>{i.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {i.role ? ROLE_LABELS[i.role as AppRole] : "A escolher"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <InviteStatusBadge used={used} expired={expired} />
                        </TableCell>
                        <TableCell className="text-right">
                          <InviteActions
                            invite={i}
                            active={active}
                            tenantName={tenant.active?.name}
                            onEdit={() => setEditingInvite(i)}
                            onDelete={() => del.mutate(i.id)}
                            iconOnly
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function InviteStatusBadge({ used, expired }: { used: boolean; expired: boolean }) {
  if (used) return <Badge>Usado</Badge>;
  if (expired) return <Badge variant="outline">Expirado</Badge>;
  return <Badge variant="secondary">Ativo</Badge>;
}

function InviteActions({
  invite,
  active,
  tenantName,
  onEdit,
  onDelete,
  iconOnly = false,
}: {
  invite: Invite;
  active: boolean;
  tenantName?: string;
  onEdit: () => void;
  onDelete: () => void;
  iconOnly?: boolean;
}) {
  return (
    <>
      <Button
        size={iconOnly ? "icon" : "sm"}
        variant={iconOnly ? "ghost" : "outline"}
        title="Copiar link"
        onClick={() => copyInviteLink(invite.code)}
      >
        <Copy className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
        {!iconOnly && "Copiar"}
      </Button>

      <Button
        size={iconOnly ? "icon" : "sm"}
        variant={iconOnly ? "ghost" : "outline"}
        title="WhatsApp"
        onClick={() => shareWhatsApp(invite.code, tenantName)}
      >
        <MessageCircle className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
        {!iconOnly && "WhatsApp"}
      </Button>

      {active && (
        <Button
          size={iconOnly ? "icon" : "sm"}
          variant={iconOnly ? "ghost" : "outline"}
          title="Editar"
          onClick={onEdit}
        >
          <Pencil className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          {!iconOnly && "Editar"}
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size={iconOnly ? "icon" : "sm"}
            variant={iconOnly ? "ghost" : "destructive"}
            title="Excluir"
          >
            <Trash2 className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
            {!iconOnly && "Excluir"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o convite de código &quot;{invite.code}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InviteForm({
  initialData,
  isEditing,
  onSubmit,
  pending,
}: {
  initialData?: {
    email: string;
    role: AppRole | "none";
    expires_in_days: number;
    polo_ids: string[];
  };
  isEditing?: boolean;
  onSubmit: (v: {
    email: string;
    role: AppRole | "none";
    expires_in_days: number;
    polo_ids: string[];
  }) => void;
  pending: boolean;
}) {
  const tenant = useTenant();
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState<AppRole | "none">(initialData?.role ?? "none");
  const [days, setDays] = useState(initialData?.expires_in_days ?? 7);
  const [poloIds, setPoloIds] = useState<string[]>(initialData?.polo_ids ?? []);

  const { data: polos = [] } = useQuery({
    queryKey: ["polos", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("polos")
        .select("id, name")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant.active,
  });

  const showPoloPicker = role === "coord_polo";
  const canSubmit = !showPoloPicker || poloIds.length > 0;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar convite" : "Novo convite"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          onSubmit({ email, role, expires_in_days: days, polo_ids: showPoloPicker ? poloIds : [] });
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="email">Email (opcional)</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Deixe em branco para link aberto"
          />
        </div>
        <div>
          <Label>Perfil</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole | "none")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Deixar o convidado escolher</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="coord_geral">Coordenador Geral</SelectItem>
              <SelectItem value="coord_polo">Coordenador de Polo</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Se o perfil não for definido, o convidado poderá escolher no momento do aceite.
          </p>
        </div>
        
        {showPoloPicker && (
          <div>
            <Label>Polos</Label>
            <div className="mt-2 max-h-48 space-y-2 overflow-auto rounded-md border p-3">
              {polos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum polo cadastrado.</p>
              ) : (
                polos.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={poloIds.includes(p.id)}
                      onCheckedChange={(v) =>
                        setPoloIds((cur) => (v ? [...cur, p.id] : cur.filter((x) => x !== p.id)))
                      }
                    />
                    {p.name}
                  </label>
                ))
              )}
            </div>
            {poloIds.length === 0 && <p className="mt-1 text-xs text-destructive">Selecione ao menos um polo para este perfil.</p>}
          </div>
        )}

        <div>
          <Label htmlFor="days">Validade (dias)</Label>
          <Input
            id="days"
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? (isEditing ? "Salvando..." : "Criando...") : (isEditing ? "Salvar alterações" : "Criar convite")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
