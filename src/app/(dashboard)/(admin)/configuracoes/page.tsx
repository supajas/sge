"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { PageBody, PageHeader } from "@/components/page";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Check,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function ConfigPage() {
  const tenant = useTenant();
  const isOwner = tenant.active?.role === "owner";

  if (!tenant.active) {
    return (
      <div className="p-6 space-y-6 max-w-xl">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerencie as informações, instituições vinculadas e preferências da plataforma."
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
              <Card className="max-w-xl border-border/60 bg-card/60 shadow-2xs">
                <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-sm">
                    Apenas o proprietário (<strong className="text-foreground">owner</strong>) da instituição possui acesso à Zona de Perigo.
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
      if (!tenant.active) throw new Error("Sem instituição ativa");
      const { error } = await supabase
        .from("institutions")
        .update({ name: values.name, city: values.city, state: values.state })
        .eq("id", tenant.active.institutionId);
      if (error) throw error;
    },
    onSuccess: () => {
      // tenant.refetch() já refaz a query interna de memberships do
      // TenantProvider. useTenant() não expõe o userId aqui fora pra montar
      // a mesma queryKey (["memberships", userId]) manualmente, então não
      // há necessidade (nem como) invalidar por fora — o refetch cobre isso.
      tenant.refetch();
      setTimeout(() => toast.success("Configurações salvas com sucesso."), 0);
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  return (
    <Card className="max-w-xl border-border/60 bg-card/60 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Informações Gerais</CardTitle>
        <CardDescription>Dados e localização para identificação da sua instituição.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inst-name" className="text-xs font-semibold">
              Nome da Instituição
            </Label>
            <Input
              id="inst-name"
              {...form.register("name")}
              disabled={!canAdmin || save.isPending}
              className="h-9"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inst-city" className="text-xs font-semibold">Cidade</Label>
              <Input
                id="inst-city"
                {...form.register("city")}
                disabled={!canAdmin || save.isPending}
                className="h-9"
              />
              {form.formState.errors.city && (
                <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inst-state" className="text-xs font-semibold">Estado</Label>
              <Input
                id="inst-state"
                {...form.register("state")}
                disabled={!canAdmin || save.isPending}
                className="h-9"
              />
              {form.formState.errors.state && (
                <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
              )}
            </div>
          </div>
        </CardContent>

        {canAdmin && (
          <CardFooter className="border-t border-border/40 pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={save.isPending || !form.formState.isDirty}
              className="shadow-2xs"
            >
              {save.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}

function InstitutionsList() {
  const { memberships, active, loading } = useTenant();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitchInstitution = (institutionId: string) => {
    setSwitchingId(institutionId);
    localStorage.setItem("active_institution_id", institutionId);
    setTimeout(() => toast.success("Alternando instituição..."), 0);
    window.location.reload();
  };

  return (
    <Card className="max-w-xl border-border/60 bg-card/60 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Suas Instituições</CardTitle>
        <CardDescription>Gerencie ou alterne entre as instituições que você faz parte.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma instituição encontrada.</p>
        ) : (
          memberships.map((m) => {
            const isActive = m.institutionId === active?.institutionId;
            const isSwitching = switchingId === m.institutionId;

            return (
              <div
                key={m.institutionId}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                  isActive
                    ? "border-primary/40 bg-primary/10 shadow-2xs"
                    : "border-border/60 bg-card/80 hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary font-semibold" : "text-foreground"}`}>
                      {m.institutionName}
                    </p>
                  </div>
                </div>

                {isActive ? (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shrink-0 gap-1">
                    <Check className="h-3 w-3" /> Ativa
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!switchingId}
                    onClick={() => handleSwitchInstitution(m.institutionId)}
                    className="h-8 text-xs hover:bg-accent shrink-0"
                  >
                    {isSwitching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Alternar
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
        <CreateInstitutionDialog />
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
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
      setTimeout(() => toast.success("Instituição criada com sucesso!"), 0);
      window.location.href = "/dashboard";
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full sm:w-auto shadow-2xs">
          <Plus className="mr-1.5 h-4 w-4" /> Criar Nova Instituição
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instituição</DialogTitle>
          <DialogDescription>
            Preencha os dados básicos para cadastrar e acessar uma nova instituição.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-name" className="text-xs font-semibold">
              Nome da Instituição
            </Label>
            <Input
              id="new-name"
              placeholder="Ex: Faculdade Central"
              {...form.register("name")}
              className="h-9"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-city" className="text-xs font-semibold">Cidade</Label>
              <Input
                id="new-city"
                placeholder="Ex: São Paulo"
                {...form.register("city")}
                className="h-9"
              />
              {form.formState.errors.city && (
                <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-state" className="text-xs font-semibold">Estado</Label>
              <Input
                id="new-state"
                placeholder="Ex: SP"
                maxLength={40}
                {...form.register("state")}
                className="h-9"
              />
              {form.formState.errors.state && (
                <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={m.isPending}>
            {m.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
              </>
            ) : (
              "Criar e Acessar"
            )}
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

  // Correção: ActiveTenant/TenantMembership tem `institutionName`, não `name`.
  const targetName = tenant.active?.institutionName ?? "";
  const isMatch = confirmName.trim() === targetName.trim();

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!tenant.active) throw new Error("Sem instituição ativa");
      return deleteInstitutionAction({ institution_id: tenant.active.institutionId });
    },
    onSuccess: () => {
      setTimeout(() => toast.success("Instituição excluída com sucesso."), 0);
      localStorage.removeItem("active_institution_id");
      tenant.refetch();
      router.replace("/onboarding");
    },
    onError: (e: Error) => setTimeout(() => toast.error(e.message), 0),
  });

  return (
    <Card className="max-w-xl border-destructive/40 bg-card/60 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" /> Zona de Perigo
        </CardTitle>
        <CardDescription>Ações irreversíveis. Tenha extrema cautela com estas operações.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col text-center sm:flex-row sm:text-left sm:items-center sm:justify-between gap-4 rounded-xl border border-dashed border-destructive/30 p-4 bg-destructive/5">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">Excluir esta instituição</h3>
            <p className="text-xs text-muted-foreground">
              Todo o conteúdo, polos, convites e vínculos serão permanentemente apagados.
            </p>
          </div>

          <AlertDialog onOpenChange={(open) => !open && setConfirmName("")}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0 shadow-2xs">
                <Trash2 className="mr-1.5 h-4 w-4" /> Excluir Instituição
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {targetName}?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground mt-2">
                    <p>
                      Esta ação é <strong className="text-destructive">irreversível</strong>. Todos os dados, convites e acessos vinculados a esta instituição serão totalmente destruídos.
                    </p>
                    <p>
                      Para confirmar, digite <strong className="text-foreground">{targetName}</strong> abaixo:
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-2">
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={targetName}
                  className="h-9"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={!isMatch || deleteMut.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteMut.mutate();
                  }}
                >
                  {deleteMut.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...
                    </>
                  ) : (
                    "Sim, excluir instituição"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}