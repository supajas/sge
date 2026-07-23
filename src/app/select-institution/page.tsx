"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

const STORAGE_KEY = "active_institution_id";

export default function SelectInstitutionPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("role, institution_id, institutions!inner(name, city, state)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  function pick(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    router.replace("/dashboard");
  }

  if (loading || isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  const list = data ?? [];

  if (list.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold">Nenhuma instituição</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você ainda não pertence a nenhuma instituição.
            </p>
            <Button className="mt-6" onClick={() => router.push("/onboarding")}>
              Começar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Escolha sua Instituição</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você pertence a mais de uma instituição.
      </p>
      <div className="mt-8 space-y-2">
        {list.map((m) => {
          const inst = m.institutions as unknown as { name: string; city: string; state: string };
          return (
            <button
              key={m.institution_id}
              onClick={() => pick(m.institution_id)}
              className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{inst.name}</div>
                <div className="text-xs text-muted-foreground">
                  {inst.city} — {inst.state} · {ROLE_LABELS[m.role as AppRole]}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
