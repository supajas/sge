"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Copy,
  MessageCircle,
  Trash2,
  Pencil,
  Mail,
  UserCheck,
  Clock,
  Loader2,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { PageBody, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS, ROLE_OPTIONS, type AppRole } from "@/lib/roles";
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

type Invite = Awaited<ReturnType<typeof fetchInvites>>[number];

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
  setTimeout(() => toast.success("Link copiado para a área de transferência."), 0);
}

function shareWhatsApp(code: string, institutionName?: string) {
  const msg = `Você foi convidado para ${institutionName ?? "a plataforma"}. Aceite pelo link: ${getInviteLink(code)}`;
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
      setTimeout(() => toast.success("Convite removido com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const update = useMutation({
    mutationFn: async (v: {
      id: string;
      email: string;
      role: AppRole;
      expires_in_days: number;
      polo_ids: string[];
      course_ids: string[];
    }) => {
      if (!tenant.active) throw new Error("Sem instituição ativa");
      return updateInviteAction({
        id: v.id,
        institution_id: tenant.active.institutionId,
        email: v.email || null,
        role: v.role,
        expires_in_days: v.expires_in_days,
        polo_ids: v.polo_ids,
        course_ids: v.course_ids,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setEditingInvite(null);
      setTimeout(() => toast.success("Convite atualizado com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  const create = useMutation({
    mutationFn: async (v: {
      email: string;
      role: AppRole;
      expires_in_days: number;
      polo_ids: string[];
      course_ids: string[];
    }) => {
      if (!tenant.active) throw new Error("Sem instituição ativa");
      return createInviteAction({
        institution_id: tenant.active.institutionId,
        email: v.email || null,
        role: v.role,
        expires_in_days: v.expires_in_days,
        single_use: true,
        polo_ids: v.polo_ids,
        course_ids: v.course_ids,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setCreateOpen(false);
      setTimeout(() => toast.success("Convite gerado com sucesso."), 0);
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

  const activeCount = data.filter(
    (i) => !i.used_at && new Date(i.expires_at).getTime() >= Date.now()
  ).length;
  const usedCount = data.filter((i) => !!i.used_at).length;

  return (
    <>
      <PageHeader
        title="Convites de Acesso"
        description="Convide colaboradores para a plataforma via e-mail, link direto ou WhatsApp."
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-2xs">
                <Plus className="mr-1.5 h-4 w-4" /> Novo Convite
              </Button>
            </DialogTrigger>
            <InviteForm
              onSubmit={(v) => create.mutate(v)}
              pending={create.isPending}
            />
          </Dialog>
        }
      />

      {/* DIÁLOGO DE EDIÇÃO */}
      <Dialog open={!!editingInvite} onOpenChange={(open) => !open && setEditingInvite(null)}>
        {editingInvite && (
          <InviteForm
            key={editingInvite.id}
            initialData={{
              email: editingInvite.email ?? "",
              role: (editingInvite.role as AppRole) ?? "secretaria",
              expires_in_days: Math.max(
                1,
                Math.ceil((new Date(editingInvite.expires_at).getTime() - Date.now()) / 86400_000)
              ),
              polo_ids: editingInvite.polo_ids ?? [],
              course_ids: editingInvite.course_ids ?? [],
            }}
            onSubmit={(v) => update.mutate({ ...v, id: editingInvite.id })}
            pending={update.isPending}
            isEditing
          />
        )}
      </Dialog>

      <PageBody>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Convites Ativos</p>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : activeCount}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Convites Aceitos</p>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : usedCount}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-2xs sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Gerados</p>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : data.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VISÃO DESKTOP */}
          <div className="hidden rounded-xl border border-border/60 bg-card/60 shadow-2xs overflow-hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Código</TableHead>
                  <TableHead className="font-semibold text-foreground">E-mail Destinatário</TableHead>
                  <TableHead className="font-semibold text-foreground">Perfil Atribuído</TableHead>
                  <TableHead className="font-semibold text-foreground">Validade</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="w-48 text-right font-semibold text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12">
                      <EmptyInvitesState />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((i) => {
                    const expired = new Date(i.expires_at).getTime() < Date.now();
                    const used = !!i.used_at;
                    const active = !expired && !used;

                    return (
                      <TableRow key={i.id} className="hover:bg-accent/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          <span className="bg-primary/10 px-2 py-1 rounded-md">
                            {i.code}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {i.email ? i.email : <span className="text-muted-foreground italic">Livre (Qualquer e-mail)</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal bg-muted/60">
                            {ROLE_LABELS[i.role as AppRole] ?? i.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <InviteStatusBadge used={used} expired={expired} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <InviteActions
                              invite={i}
                              active={active}
                              tenantName={tenant.active?.institutionName}
                              onEdit={() => setEditingInvite(i)}
                              onDelete={() => del.mutate(i.id)}
                              iconOnly
                            />
                          </div>
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
  if (used) {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
        Usado
      </Badge>
    );
  }
  if (expired) {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
        Expirado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
      Ativo
    </Badge>
  );
}

function EmptyInvitesState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 mb-3">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhum convite pendente</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Gere links de convite para adicionar colaboradores à sua instituição.
      </p>
    </div>
  );
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
        variant="ghost"
        className={iconOnly ? "h-8 w-8 text-muted-foreground hover:text-foreground" : "h-8 text-xs hover:bg-accent"}
        title="Copiar Link"
        onClick={() => copyInviteLink(invite.code)}
      >
        <Copy className={iconOnly ? "h-3.5 w-3.5" : "mr-1.5 h-3.5 w-3.5"} />
        {!iconOnly && "Copiar"}
      </Button>

      <Button
        size={iconOnly ? "icon" : "sm"}
        variant="ghost"
        className={iconOnly ? "h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400" : "h-8 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"}
        title="Compartilhar no WhatsApp"
        onClick={() => shareWhatsApp(invite.code, tenantName)}
      >
        <MessageCircle className={iconOnly ? "h-3.5 w-3.5" : "mr-1.5 h-3.5 w-3.5"} />
        {!iconOnly && "WhatsApp"}
      </Button>

      {active && (
        <Button
          size={iconOnly ? "icon" : "sm"}
          variant="ghost"
          className={iconOnly ? "h-8 w-8 text-muted-foreground hover:text-foreground" : "h-8 text-xs hover:bg-accent"}
          title="Editar Convite"
          onClick={onEdit}
        >
          <Pencil className={iconOnly ? "h-3.5 w-3.5" : "mr-1.5 h-3.5 w-3.5"} />
          {!iconOnly && "Editar"}
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size={iconOnly ? "icon" : "sm"}
            variant="ghost"
            className={
              iconOnly
                ? "h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                : "h-8 text-xs text-destructive hover:bg-destructive/10"
            }
            title="Excluir Convite"
          >
            <Trash2 className={iconOnly ? "h-3.5 w-3.5" : "mr-1.5 h-3.5 w-3.5"} />
            {!iconOnly && "Excluir"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o convite <strong className="text-foreground">{invite.code}</strong>? Esta ação desativará o link de acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Convite
            </AlertDialogAction>
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
    role: AppRole;
    expires_in_days: number;
    polo_ids: string[];
    course_ids: string[];
  };
  isEditing?: boolean;
  onSubmit: (v: {
    email: string;
    role: AppRole;
    expires_in_days: number;
    polo_ids: string[];
    course_ids: string[];
  }) => void;
  pending: boolean;
}) {
  const tenant = useTenant();
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState<AppRole>(initialData?.role ?? "secretaria");
  const [days, setDays] = useState(initialData?.expires_in_days ?? 7);
  const [poloIds, setPoloIds] = useState<string[]>(initialData?.polo_ids ?? []);
  const [courseIds, setCourseIds] = useState<string[]>(initialData?.course_ids ?? []);

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

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", tenant.active?.institutionId],
    queryFn: async () => {
      if (!tenant.active) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", tenant.active.institutionId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant.active,
  });

  const showPoloPicker = role === "coord_polo" || role === "tutor_presencial";
  const showCoursePicker = role === "coord_curso" || role === "tutor_distancia" || role === "professor";

  const canSubmit =
    (!showPoloPicker || poloIds.length > 0) &&
    (!showCoursePicker || courseIds.length > 0);

  const handleRoleChange = (newRole: AppRole) => {
    setRole(newRole);
    if (newRole !== "coord_polo" && newRole !== "tutor_presencial") {
      setPoloIds([]);
    }
    if (newRole !== "coord_curso" && newRole !== "tutor_distancia" && newRole !== "professor") {
      setCourseIds([]);
    }
  };

  return (
    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar Convite" : "Gerar Novo Convite"}</DialogTitle>
        <DialogDescription>
          Configure o perfil e a validade do convite antes de compartilhá-lo.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          onSubmit({
            email,
            role,
            expires_in_days: days,
            polo_ids: showPoloPicker ? poloIds : [],
            course_ids: showCoursePicker ? courseIds : [],
          });
        }}
        className="space-y-4 pt-2"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">
            E-mail do Destinatário <span className="text-muted-foreground font-normal">(Opcional)</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Ex: colaborador@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Perfil de Acesso</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as AppRole)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50 max-h-60 overflow-y-auto">
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="days" className="text-xs font-semibold">Validade (dias)</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>

        {/* SELETOR DE POLOS */}
        {showPoloPicker && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label className="text-xs font-semibold">
              Vincular aos Polos <span className="text-destructive">*</span>
            </Label>
            <div className="max-h-36 overflow-y-auto space-y-2 border border-border/60 rounded-md p-2.5 bg-muted/20">
              {polos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum polo cadastrado.</p>
              ) : (
                polos.map((polo) => (
                  <div key={polo.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`polo-${polo.id}`}
                      checked={poloIds.includes(polo.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPoloIds([...poloIds, polo.id]);
                        } else {
                          setPoloIds(poloIds.filter((id) => id !== polo.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`polo-${polo.id}`}
                      className="text-xs font-medium text-foreground cursor-pointer leading-none"
                    >
                      {polo.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SELETOR DE CURSOS */}
        {showCoursePicker && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label className="text-xs font-semibold">
              Vincular aos Cursos <span className="text-destructive">*</span>
            </Label>
            <div className="max-h-36 overflow-y-auto space-y-2 border border-border/60 rounded-md p-2.5 bg-muted/20">
              {courses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum curso cadastrado.</p>
              ) : (
                courses.map((course) => (
                  <div key={course.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`course-${course.id}`}
                      checked={courseIds.includes(course.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCourseIds([...courseIds, course.id]);
                        } else {
                          setCourseIds(courseIds.filter((id) => id !== course.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`course-${course.id}`}
                      className="text-xs font-medium text-foreground cursor-pointer leading-none"
                    >
                      {course.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="submit" disabled={!canSubmit || pending} className="w-full sm:w-auto">
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : isEditing ? (
              "Salvar Alterações"
            ) : (
              "Gerar Convite"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
