"use client";

import { createFileRoute, useNavigate } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { previewInvite, redeemInvite } from "@/lib/invites.functions";
import { useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { lovable } from "@/integrations/lovable/index";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$code")({
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const { user, loading } = useSession();
  const navigate = useRouter();
  const preview = useServerFn(previewInvite);
  const redeem = useServerFn(redeemInvite);

  const [chosenRole, setChosenRole] = useState<"coord_geral" | "coord_polo" | "">("");
  const [chosenPolos, setChosenPolos] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: () => preview({ data: { code } }),
  });

  const m = useMutation({
    mutationFn: () =>
      redeem({
        data: {
          code,
          role: data?.found && data.needsRole ? (chosenRole || null) : null,
          polo_ids: data?.found && data.needsPolo ? chosenPolos : [],
        },
      }),
    onSuccess: (res) => {
      localStorage.setItem("active_institution_id", res.institutionId);
      toast.success("Convite aceito!");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pending_invite_code", code);
    }
  }, [code]);

  if (!data) return <div className="min-h-screen bg-background" />;

  if (!data.found) {
    return (
      <Center>
        <h1 className="text-xl font-semibold">Convite inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">Este código não existe.</p>
      </Center>
    );
  }

  if (data.expired || data.used) {
    return (
      <Center>
        <h1 className="text-xl font-semibold">Convite indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.expired ? "Este convite expirou." : "Este convite já foi usado."}
        </p>
      </Center>
    );
  }

  const showPoloPicker = data.needsPolo && (data.needsRole ? chosenRole === "coord_polo" : data.role === "coord_polo");
  const canSubmit =
    !!user &&
    (!data.needsRole || !!chosenRole) &&
    (!showPoloPicker || chosenPolos.length > 0);

  return (
    <Center>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Convite</p>
      <h1 className="mt-1 text-2xl font-semibold">{data.institutionName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.institutionCity} — {data.institutionState}
      </p>

      {!data.needsRole && data.role && (
        <p className="mt-4 text-sm">
          Você entrará como <strong>{ROLE_LABELS[data.role as AppRole]}</strong>.
        </p>
      )}

      {user && data.needsRole && (
        <div className="mt-6 text-left">
          <Label>Seu papel</Label>
          <Select value={chosenRole} onValueChange={(v) => setChosenRole(v as "coord_geral" | "coord_polo")}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="coord_geral">Coordenador Geral</SelectItem>
              <SelectItem value="coord_polo">Coordenador de Polo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {user && showPoloPicker && (
        <div className="mt-4 text-left">
          <Label>Polos</Label>
          <div className="mt-2 max-h-48 space-y-2 overflow-auto rounded-md border p-3">
            {data.polos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum polo cadastrado ainda nesta instituição.</p>
            ) : (
              data.polos.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={chosenPolos.includes(p.id)}
                    onCheckedChange={(v) =>
                      setChosenPolos((cur) => (v ? [...cur, p.id] : cur.filter((x) => x !== p.id)))
                    }
                  />
                  {p.name}
                </label>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading ? null : user ? (
          <Button className="w-full" onClick={() => m.mutate()} disabled={!canSubmit || m.isPending}>
            {m.isPending ? "Aceitando..." : "Aceitar convite"}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() =>
              lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.href,
              })
            }
          >
            Entrar com Google para aceitar
          </Button>
        )}
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}
