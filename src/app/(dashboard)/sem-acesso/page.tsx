"use client";


import { LockKeyhole } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/sem-acesso")({
  component: SemAcessoPage,
});

export default function Page() {
  const active = useActiveTenant();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-6">
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <LockKeyhole className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            Sem acesso a Polos
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Você está vinculado à instituição{" "}
            <strong className="text-foreground">{active.institutionName}</strong>,
            porém não possui acesso a nenhum Polo no momento.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Solicite ao administrador que associe seu usuário a um ou mais Polos
            para continuar utilizando o sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
