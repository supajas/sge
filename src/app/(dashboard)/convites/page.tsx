"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, MessageCircle, Trash2 } from "lucide-react";
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
import { createInviteAction } from "./actions";

export default function ConvitesPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["invites", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("institution_id", tenant.active.institutionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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

  const create = useMutation({
    mutationFn: async (v: { email: string; role: AppRole | "none"; expires_in_days: number }) => {
      if (!tenant.active) throw new Error("No active institution");
      return createInviteAction({
        institution_id: tenant.active.institutionId,
        email: v.email || null,
        role: v.role === "none" ? null : (v.role as "admin" | "coord_geral" | "coord_polo"),
        expires_in_days: v.expires_in_days,
        single_use: true,
      });
    },
    onSuccess: () => {
      setOpen(false);
      toast.success("Convite criado");
      // Revalidation is handled by the server action
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function link(code: string) {
    return `${window.location.origin}/invite/${code}`;
  }

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Convites"
        description="Convide colaboradores por email, link ou WhatsApp."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Novo convite
              </Button>
            </DialogTrigger>
            <InviteForm onSubmit={(v) => create.mutate(v)} pending={create.isPending} />
          </Dialog>
        }
      />
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
                  return (
                    <div key={i.id} className="rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="font-mono text-sm">{i.code}</div>
                        {used ? (
                          <Badge>Usado</Badge>
                        ) : expired ? (
                          <Badge variant="outline">Expirado</Badge>
                        ) : (
                          <Badge variant="secondary">Ativo</Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p><span className="font-medium text-foreground">Email:</span> {i.email ?? "Qualquer um"}</p>
                        <p><span className="font-medium text-foreground">Perfil:</span> {i.role ? ROLE_LABELS[i.role as AppRole] : "A escolher"}</p>
                        <p><span className="font-medium text-foreground">Expira:</span> {new Date(i.expires_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(link(i.code));
                            toast.success("Link copiado");
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copiar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const msg = `Você foi convidado para ${tenant.active?.name}. Aceite: ${link(i.code)}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o convite de código "{i.code}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(i.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                          {used ? (
                            <Badge>Usado</Badge>
                          ) : expired ? (
                            <Badge variant="outline">Expirado</Badge>
                          ) : (
                            <Badge variant="secondary">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Copiar link"
                            onClick={() => {
                              navigator.clipboard.writeText(link(i.code));
                              toast.success("Link copiado");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="WhatsApp"
                            onClick={() => {
                              const msg = `Você foi convidado para ${tenant.active?.name}. Aceite: ${link(
                                i.code
                              )}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o convite de código "{i.code}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(i.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

function InviteForm({
  onSubmit,
  pending,
}: {
  onSubmit: (v: { email: string; role: AppRole | "none"; expires_in_days: number }) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | "none">("none");
  const [days, setDays] = useState(7);
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo convite</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, role, expires_in_days: days });
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
          <Button type="submit" disabled={pending}>
            {pending ? "Criando..." : "Criar convite"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
