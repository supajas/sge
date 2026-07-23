"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Building2, Plus, Trash2 } from "lucide-react";
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

export default function ConfigPage() {
  const tenant = useTenant();
  const isOwner = tenant.active?.role === "owner";

  if (!tenant.active) {
    return <div className="p-6"><p>Carregando...</p></div>;
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
            {isOwner ? <DangerZone /> : <p className="text-sm text-muted-foreground">Apenas o proprietário (owner) da instituição pode ver esta seção.</p>}
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function GeneralSettings() {
  const tenant = useTenant();
  const qc = useQueryClient();
  
  // Initialize state with empty strings for safety
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Effect to sync form state with tenant data when it becomes available
  useEffect(() => {
    if (tenant.active) {
      setName(tenant.active.name ?? "");
      setCity(tenant.active.city ?? "");
      setState(tenant.active.state ?? "");
    }
  }, [tenant.active]);

  const canAdmin = tenant.active ? isAdminLike(tenant.active.role) : false;

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant.active) throw new Error("No active institution");
      const { error } = await supabase
        .from("institutions")
        .update({ name, city, state })
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
      <CardContent className="space-y-4">
        <div>
          <Label>Nome da Instituição</Label>
          <Input value={name ?? ""} onChange={(e) => setName(e.target.value)} disabled={!canAdmin} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cidade</Label>
            <Input value={city ?? ""} onChange={(e) => setCity(e.target.value)} disabled={!canAdmin} />
          </div>
          <div>
            <Label>Estado</Label>
            <Input value={state ?? ""} onChange={(e) => setState(e.target.value)} disabled={!canAdmin} />
          </div>
        </div>
      </CardContent>
      {canAdmin && (
        <CardFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function InstitutionsList() {
  const { user, active } = useTenant();
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("memberships")
        .select("institution_id, institutions!inner(name)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Suas Instituições</CardTitle>
        <CardDescription>Você pode criar ou entrar em outras instituições.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {memberships.map(m => {
          const isActive = m.institution_id === active?.institutionId;
          return (
            <div key={m.institution_id} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${isActive ? "border-primary/50 bg-primary/5" : ""}`}>
              <div className="flex items-center gap-3">
                <Building2 className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`font-medium ${isActive ? "text-primary" : ""}`}>{m.institutions?.name}</p>
              </div>
              {isActive && <Badge variant="secondary">Ativa</Badge>}
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="flex justify-between">
        <CreateInstitutionDialog />
        <Button asChild variant="outline">
          <Link href="/onboarding">Trocar de instituição</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

const instSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  logo_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

function CreateInstitutionDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const tenant = useTenant();
  const form = useForm<z.infer<typeof instSchema>>({
    resolver: zodResolver(instSchema),
    defaultValues: { name: "", city: "", state: "", logo_url: "" },
  });

  const m = useMutation({
    mutationFn: bootstrapInstitutionAction,
    onSuccess: (res) => {
      localStorage.setItem("active_institution_id", res.institutionId);
      toast.success("Instituição criada! Trocando para a nova instituição...");
      // We can't just refetch, we need to fully reload to re-run the root layout logic
      window.location.href = "/dashboard";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Criar Nova Instituição</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Instituição</DialogTitle>
          <DialogDescription>Preencha os dados básicos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Instituição</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" {...form.register("city")} />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input id="state" maxLength={40} {...form.register("state")} />
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

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!tenant.active) throw new Error("No active institution");
      return deleteInstitutionAction({ institution_id: tenant.active.institutionId });
    },
    onSuccess: () => {
      toast.success("Instituição excluída.");
      // Force refetch of user's memberships and redirect to onboarding
      tenant.refetch();
      router.replace("/onboarding");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-xl border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        <CardDescription>Ações irreversíveis. Tenha muito cuidado.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-dashed border-destructive/50 p-4">
          <div>
            <h3 className="font-semibold">Excluir esta instituição</h3>
            <p className="text-sm text-muted-foreground">Todo o conteúdo será permanentemente apagado.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a instituição
                  <strong className="mx-1">{tenant.active?.name}</strong>
                  e todos os seus dados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => deleteMut.mutate()}
                >
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

