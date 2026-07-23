"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Building2, Mail, ArrowLeft, Loader2, ChevronRight, Plus } from "lucide-react";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { toast } from "sonner";
import { bootstrapInstitutionAction, previewInviteAction, redeemInviteAction } from "./actions";

const instSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  logo_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type Step = "menu" | "select" | "create" | "invite" | "no-invite";

type UserMembership = {
  institution_id: string;
  role: string;
  institutions: {
    id: string;
    name: string;
    city: string;
    state: string;
    logo_url: string | null;
  } | null;
};

export default function OnboardingPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>("menu");
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);

  useEffect(() => {
    async function checkExistingMemberships() {
      if (loading) return;

      if (!user) {
        router.replace("/");
        return;
      }

      try {
        // Busca todas as instituições vinculadas ao usuário
        const { data, error } = await supabase
          .from("memberships")
          .select(
            `
            institution_id,
            role,
            institutions (
              id,
              name,
              city,
              state,
              logo_url
            )
          `
          )
          .eq("user_id", user.id);

        if (error) throw error;

        const list = (data || []) as unknown as UserMembership[];
        setMemberships(list);

        if (list.length === 1) {
          // Se o usuário tem exatamente 1 instituição, entra direto!
          localStorage.setItem("active_institution_id", list[0].institution_id);
          router.replace("/dashboard");
          return;
        } else if (list.length > 1) {
          // Se tem 2 ou mais, mostra a tela de seleção
          setStep("select");
        } else {
          // 0 instituições -> mostra o menu padrão de criação/convite
          setStep("menu");
        }
      } catch (err) {
        console.error("Erro ao verificar vínculos do usuário:", err);
      } finally {
        setCheckingMembership(false);
      }
    }

    checkExistingMemberships();
  }, [user, loading, router]);

  if (loading || checkingMembership) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      {/* Botão de Voltar */}
      {step !== "menu" && step !== "select" && (
        <button
          onClick={() => setStep(memberships.length > 0 ? "select" : "menu")}
          className="mb-6 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      {step === "select" && (
        <SelectInstitutionList
          memberships={memberships}
          onSelect={(instId) => {
            localStorage.setItem("active_institution_id", instId);
            router.replace("/dashboard");
          }}
          onCreateNew={() => setStep("create")}
          onUseInvite={() => setStep("invite")}
        />
      )}

      {step === "menu" && <Menu onPick={setStep} />}
      {step === "create" && <CreateForm />}
      {step === "invite" && <InviteForm />}
      {step === "no-invite" && <NoInvite />}
    </div>
  );
}

function SelectInstitutionList({
  memberships,
  onSelect,
  onCreateNew,
  onUseInvite,
}: {
  memberships: UserMembership[];
  onSelect: (institutionId: string) => void;
  onCreateNew: () => void;
  onUseInvite: () => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Suas Instituições</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você pertence a mais de uma instituição. Escolha qual deseja acessar.
      </p>

      <div className="mt-6 space-y-3">
        {memberships.map((item) => {
          const inst = item.institutions;
          if (!inst) return null;

          return (
            <button
              key={item.institution_id}
              onClick={() => onSelect(item.institution_id)}
              className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-medium">
                  {inst.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-foreground">{inst.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inst.city} — {inst.state} •{" "}
                    <span className="font-medium text-foreground/80">
                      {ROLE_LABELS[item.role as AppRole] || item.role}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-6">
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" /> Criar nova Instituição
        </Button>
        <Button variant="ghost" size="sm" className="w-full sm:w-auto text-muted-foreground" onClick={onUseInvite}>
          <Mail className="mr-2 h-4 w-4" /> Usar outro convite
        </Button>
      </div>
    </>
  );
}

function Menu({ onPick }: { onPick: (s: Step) => void }) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo!</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você ainda não pertence a nenhuma instituição. Escolha uma opção.
      </p>
      <div className="mt-8 space-y-2">
        <ActionCard
          icon={<Building2 className="h-5 w-5" />}
          title="Criar uma nova Instituição"
          body="Comece do zero como Owner."
          onClick={() => onPick("create")}
        />
        <ActionCard
          icon={<Mail className="h-5 w-5" />}
          title="Possuo um convite"
          body="Use o código enviado pela sua instituição."
          onClick={() => onPick("invite")}
        />
        <button
          className="mt-6 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => onPick("no-invite")}
        >
          Não tenho convite
        </button>
      </div>
    </>
  );
}

function ActionCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{body}</div>
      </div>
    </button>
  );
}

function CreateForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof instSchema>>({
    resolver: zodResolver(instSchema),
    defaultValues: { name: "", city: "", state: "", logo_url: "" },
  });

  const m = useMutation({
    mutationFn: bootstrapInstitutionAction,
    onSuccess: (res) => {
      localStorage.setItem("active_institution_id", res.institutionId);
      toast.success("Instituição criada!");
      router.replace("/dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <h1 className="text-2xl font-semibold">Nova Instituição</h1>
      <p className="mt-1 text-sm text-muted-foreground">Preencha os dados básicos.</p>
      <Card className="mt-6">
        <CardContent className="p-6">
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
            <div>
              <Label htmlFor="logo">Logo (URL, opcional)</Label>
              <Input id="logo" placeholder="https://..." {...form.register("logo_url")} />
            </div>
            <Button type="submit" className="w-full" disabled={m.isPending}>
              {m.isPending ? "Criando..." : "Criar Instituição"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function InviteForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [previewData, setPreviewData] = useState<Awaited<ReturnType<typeof previewInviteAction>> | null>(null);
  const [chosenRole, setChosenRole] = useState<"coord_geral" | "coord_polo" | "">("");
  const [chosenPolos, setChosenPolos] = useState<string[]>([]);

  const previewMut = useMutation({
    mutationFn: previewInviteAction,
    onSuccess: (res) => {
      if (!res.found) { toast.error("Convite não encontrado"); return; }
      if (res.expired) { toast.error("Convite expirado"); return; }
      if (res.used) { toast.error("Convite já utilizado"); return; }
      setPreviewData(res);
      setChosenRole("");
      setChosenPolos([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redeemMut = useMutation({
    mutationFn: async () =>
      redeemInviteAction({
        code,
        role: previewData?.found && previewData.needsRole ? (chosenRole || null) : null,
        polo_ids: previewData?.found && previewData.needsPolo ? chosenPolos : [],
      }),
    onSuccess: (res) => {
      localStorage.setItem("active_institution_id", res.institutionId);
      toast.success("Convite aceito!");
      router.replace("/dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (previewData && previewData.found) {
    const showPoloPicker =
      previewData.needsPolo &&
      (previewData.needsRole ? chosenRole === "coord_polo" : previewData.role === "coord_polo");
    const canSubmit =
      (!previewData.needsRole || !!chosenRole) &&
      (!showPoloPicker || chosenPolos.length > 0);
    return (
      <>
        <h1 className="text-2xl font-semibold">{previewData.institutionName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {previewData.institutionCity} — {previewData.institutionState}
        </p>
        <Card className="mt-6">
          <CardContent className="space-y-4 p-6">
            {!previewData.needsRole && previewData.role && (
              <p className="text-sm">
                Você entrará como <strong>{ROLE_LABELS[previewData.role as AppRole]}</strong>.
              </p>
            )}
            {previewData.needsRole && (
              <div>
                <Label>Seu papel</Label>
                <Select
                  value={chosenRole}
                  onValueChange={(v) => setChosenRole(v as "coord_geral" | "coord_polo")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coord_geral">Coordenador Geral</SelectItem>
                    <SelectItem value="coord_polo">Coordenador de Polo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {showPoloPicker && (
              <div>
                <Label>Polos</Label>
                <div className="mt-2 max-h-48 space-y-2 overflow-auto rounded-md border p-3">
                  {previewData.polos.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum polo cadastrado ainda.</p>
                  ) : (
                    previewData.polos.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={chosenPolos.includes(p.id)}
                          onCheckedChange={(v) =>
                            setChosenPolos((cur) =>
                              v ? [...cur, p.id] : cur.filter((x) => x !== p.id)
                            )
                          }
                        />
                        {p.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewData(null)}>Voltar</Button>
              <Button
                className="flex-1"
                disabled={!canSubmit || redeemMut.isPending}
                onClick={() => redeemMut.mutate()}
              >
                {redeemMut.isPending ? "Aceitando..." : "Aceitar convite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Usar convite</h1>
      <p className="mt-1 text-sm text-muted-foreground">Informe o código recebido.</p>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div>
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              className="uppercase"
            />
          </div>
          <Button
            className="w-full"
            disabled={!code || previewMut.isPending}
            onClick={() => previewMut.mutate()}
          >
            {previewMut.isPending ? "Validando..." : "Continuar"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function NoInvite() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Sem acesso ainda</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Você ainda não possui acesso a nenhuma instituição. Solicite um convite ao administrador
        da sua instituição.
      </p>
    </>
  );
}
