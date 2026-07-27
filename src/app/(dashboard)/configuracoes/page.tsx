"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Check, Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteInstitutionAction } from "./actions";
import { bootstrapInstitutionAction } from "@/app/onboarding/actions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

export default function ConfigPage() {
  const tenant = useTenant();
  const isOwner = tenant.active?.role === "owner";

  if (!tenant.active) {
    return (
      <div className="flex h-48 items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando configurações...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerencie as informações e ações da sua instituição."
      />
      <PageBody>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="institutions">Instituições</TabsTrigger>
            <TabsTrigger value="danger">Perigo</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-6">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="institutions" className="mt-6">
            <InstitutionsList />
          </TabsContent>
          <TabsContent value="danger" className="mt-6">
            {isOwner ? (
              <DangerZone />
            ) : (
              <Card className="max-w-xl">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Apenas o proprietário (owner) da instituição tem acesso à Zona de Perigo.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

const generalSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  city: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  state: z.string().trim().min(2, "Mínimo 2 caracteres").max(40, "Máximo 40 caracteres"),
});

function GeneralSettings() {
  const tenant = useTenant();
  const qc = useQueryClient();

  const canAdmin = tenant.active ? isAdminLike(tenant.active.role) : false;

  const form = useForm<z.infer<typeof generalSchema>>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: tenant.active?.institutionName ?? "",
      city: tenant.active?.city ?? "",
      state: tenant.active?.state ?? "",
    },
  });

  useEffect(() => {
    if (tenant.active) {
      form.reset({
        name: tenant.active.institutionName ?? "",
        city: tenant.active.city ?? "",
        state: tenant.active.state ?? "",
      });
    }
  }, [tenant.active, form]);

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof generalSchema>) => {
      if (!tenant.active) throw new Error("No active institution");
      const { error } = await supabase
        .from("institutions")
        .update({ name: values.name, city: values.city, state: values.state })
        .eq("id", tenant.active.institutionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships", tenant.user?.id] });
      tenant.refetch();
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
        <CardDescription>Dados de identificação da sua instituição.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="inst-name">Nome da Instituição</Label>
            <Input id="inst-name" {...form.register("name")} disabled={!canAdmin} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inst-city">Cidade</Label>
              <Input id="inst-city" {...form.register("city")} disabled={!canAdmin} />
              {form.formState.errors.city && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="inst-state">Estado</Label>
              <Input id="inst-state" {...form.register("state")} disabled={!canAdmin} />
              {form.formState.errors.state && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.state.message}</p>
              )}
            </div>
          </div>
        </CardContent>
        {canAdmin && (
          <CardFooter>
            <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
              {save.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}

function InstitutionsList() {
  const { memberships, active, loading } = useTenant();

  const handleSwitchInstitution = (institutionId: string) => {
    localStorage.setItem("active_institution_id", institutionId);
    toast.success("Alternando instituição...");
    window.location.reload();
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Suas Instituições</CardTitle>
        <CardDescription>Você pode gerenciar ou trocar entre suas instituições.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {memberships.map((m) => {
          const isActive = m.institutionId === active?.institutionId;
          return (
            <div
              key={m.institutionId}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 transition-colors ${
                isActive ? "border-primary/50 bg-primary/5" : "bg-card hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Building2 className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`font-medium truncate ${isActive ? "text-primary" : ""}`}>{m.institutionName}</p>
              </div>

              {isActive ? (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <Check className="h-3 w-3" /> Ativa
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSwitchInstitution(m.institutionId)}
                >
                  Alternar
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
        <CreateInstitutionDialog />
        <Button asChild variant="outline">
          <Link href="/onboarding">Ver todas no onboarding</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

const instSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  city: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  state: z.string().trim().min(2, "Mínimo 2 caracteres").max(40, "Máximo 40 caracteres"),
  logo_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

function CreateInstitutionDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof instSchema>>({
    resolver: zodResolver(instSchema),
    defaultValues: { name: "", city: "", state: "", logo_url: "" },
  });

  const m = useMutation({
    mutationFn: bootstrapInstitutionAction,
    onSuccess: (res) => {
      localStorage.setItem("active_institution_id", res.institutionId);
      toast.success("Instituição criada com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Criar Nova Instituição
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Instituição</DialogTitle>
          <DialogDescription>Preencha os dados básicos para cadastrar uma nova instituição.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
          <div>
            <Label htmlFor="new-name">Nome da Instituição</Label>
            <Input id="new-name" placeholder="Ex: Faculdade Central" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-city">Cidade</Label>
              <Input id="new-city" placeholder="Ex: São Paulo" {...form.register("city")} />
              {form.formState.errors.city && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="new-state">Estado</Label>
              <Input id="new-state" placeholder="Ex: SP" maxLength={40} {...form.register("state")} />
              {form.formState.errors.state && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.state.message}</p>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={m.isPending}>
            {m.isPending ? "Criando..." : "Criar e Acessar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DangerZone() {
  const tenant = useTenant();
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");

  const targetName = tenant.active?.name ?? "";
  const isMatch = confirmName.trim() === targetName.trim();

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!tenant.active) throw new Error("No active institution");
      return deleteInstitutionAction({ institution_id: tenant.active.institutionId });
    },
    onSuccess: () => {
      toast.success("Instituição excluída.");
      localStorage.removeItem("active_institution_id");
      tenant.refetch();
      router.replace("/onboarding");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-xl border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        <CardDescription>Ações irreversíveis. Tenha muito cuidado com estas operações.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col text-center sm:flex-row sm:text-left sm:items-center sm:justify-between gap-4 rounded-lg border border-dashed border-destructive/40 p-4 bg-destructive/5">
          <div>
            <h3 className="font-semibold text-foreground">Excluir esta instituição</h3>
            <p className="text-sm text-muted-foreground">Todo o conteúdo e vínculos serão permanentemente apagados.</p>
          </div>
          <AlertDialog onOpenChange={(open) => !open && setConfirmName("")}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {targetName}?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Esta ação é <strong className="text-destructive">irreversível</strong>. Todos os dados,
                    convites e acessos vinculados a esta instituição serão destruídos.
                  </p>
                  <p className="text-sm">
                    Para confirmar, digite <strong className="text-foreground">{targetName}</strong> abaixo:
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-2">
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={targetName}
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={!isMatch || deleteMut.isPending}
                  onClick={() => deleteMut.mutate()}
                >
                  {deleteMut.isPending ? "Excluindo..." : "Sim, excluir instituição"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
