"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import { toast } from "sonner";

export default function HomePage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("memberships")
        .select("institution_id")
        .eq("user_id", user.id);
      const count = data?.length ?? 0;
      if (count === 0) router.replace("/onboarding");
      else if (count === 1) router.replace("/dashboard");
      else router.replace("/select-institution");
    })();
  }, [user, loading, router]);

  async function signIn() {
    setSigning(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setSigning(false);
      toast.error("Não foi possível iniciar o login");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">SGE Acadêmico</span>
        </div>
        <Button size="sm" onClick={signIn} disabled={signing} id="btn-login-header">
          {signing ? "Aguarde..." : "Entrar com Google"}
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Gestão acadêmica <span className="text-primary">sem fricção</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Uma plataforma multi-tenant para instituições de ensino gerenciarem polos, cursos,
            turmas, disciplinas, alunos e notas — com isolamento total entre instituições.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={signIn} disabled={signing} id="btn-login-hero">
              {signing ? "Aguarde..." : "Entrar com Google"}
            </Button>
            <span className="text-sm text-muted-foreground">
              Sem cadastro — use sua conta Google.
            </span>
          </div>
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Multi-tenant seguro",
              body: "Row Level Security garante isolamento total entre instituições.",
            },
            {
              icon: Users,
              title: "Perfis e escopo",
              body: "Owner, Administrador, Coordenador Geral e Coordenador de Polo.",
            },
            {
              icon: Zap,
              title: "Rápido e limpo",
              body: "Interface inspirada em Notion e Linear. Foco no essencial.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
