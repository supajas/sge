"use client";

import { useEffect, useState, use } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { previewInviteAction, redeemInviteAction } from "@/lib/actions/invites";
import { useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage({ params }: { params: { code: string } }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [role, setRole] = useState<"coord_geral" | "coord_polo" | "">("");
  const [polos, setPolos] = useState<string[]>([]);

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ["invite_preview", code],
    queryFn: () => previewInviteAction(code),
    enabled: !!session && !!code,
  });

  const redeem = useMutation({
    mutationFn: redeemInviteAction,
    onSuccess: (data) => {
      if (data?.institutionId) {
        localStorage.setItem("active_institution_id", data.institutionId);
        toast.success("Convite aceito! Bem-vindo(a).");
        window.location.href = "/dashboard";
      }
    },
    onError: (e) => {
      toast.error(e.message);
    }
  });

  useEffect(() => {
    if (!sessionLoading && !session) {
      const currentPath = `/invite/${code}`;
      router.replace(`/?redirect_to=${encodeURIComponent(currentPath)}`);
    }
  }, [session, sessionLoading, router, code]);

  if (sessionLoading || !session || previewLoading) {
    return <Center><p>Carregando...</p></Center>;
  }

  if (previewError) {
    return (
      <Center>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{previewError.message}</AlertDescription>
        </Alert>
      </Center>
    );
  }

  if (!preview?.found) {
    return (
      <Center>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Convite inválido</AlertTitle>
          <AlertDescription>O código do convite não foi encontrado.</AlertDescription>
        </Alert>
      </Center>
    );
  }

  if (preview.used) {
    return (
      <Center>
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Convite já utilizado</AlertTitle>
          <AlertDescription>
            Este convite já foi aceito.
          </AlertDescription>
        </Alert>
      </Center>
    );
  }

  if (preview.expired) {
    return (
      <Center>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Convite expirado</AlertTitle>
          <AlertDescription>
            Este convite não é mais válido.
          </AlertDescription>
        </Alert>
      </Center>
    );
  }

  if (redeem.isSuccess) {
    return (
      <Center>
        <PartyPopper className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-4 text-2xl font-bold">Bem-vindo(a)!</h2>
        <p className="mt-2 text-muted-foreground">
          Você agora faz parte de {preview.institutionName}.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Redirecionando para o sistema...</p>
      </Center>
    );
  }
  
  const showPoloPicker = preview.needsPolo && role === "coord_polo";
  const canSubmit = (preview.needsRole ? !!role : true) && (showPoloPicker ? polos.length > 0 : true);

  return (
    <Center>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Convite para</p>
      <h1 className="mt-1 text-2xl font-semibold">{preview.institutionName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {preview.institutionCity}, {preview.institutionState}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          redeem.mutate({ code, role: role || null, polo_ids: polos });
        }}
        className="mt-6 space-y-4 text-left"
      >
        {preview.needsRole && (
          <div>
            <Label>Seu papel na instituição</Label>
            <Select name="role" required value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione..." />
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
            <Label>Quais polos você coordena?</Label>
            <div className="mt-2 max-h-48 space-y-2 overflow-auto rounded-md border p-3">
              {preview.polos.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={polos.includes(p.id)}
                    onCheckedChange={(checked) => {
                      setPolos(current => checked ? [...current, p.id] : current.filter(id => id !== p.id))
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit || redeem.isPending}
        >
          {redeem.isPending ? "Aceitando..." : "Entrar e aceitar convite"}
        </Button>
      </form>
    </Center>
  );
}
