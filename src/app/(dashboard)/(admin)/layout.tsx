"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/lib/tenant";
import { isAdminLike } from "@/lib/roles";
import { Skeleton } from "@/components/ui/skeleton";

// Guarda única para todas as páginas admin-only (Colaboradores, Convites,
// Configurações, Templates de Notas). As páginas individuais não precisam
// mais checar `isAdminLike`/`canAdmin` por conta própria só para decidir se
// renderizam — isso já é garantido aqui. Elas continuam livres para usar
// checagens mais finas internamente (ex: "Zona de Perigo" só para owner).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (tenant.active && !isAdminLike(tenant.active.role)) {
      router.replace("/sem-acesso");
    }
  }, [tenant.active, router]);

  // Enquanto o tenant ainda não carregou, mostra um skeleton neutro —
  // mesmo padrão já usado em outras páginas do projeto.
  if (!tenant.active) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Evita o "flash" do conteúdo protegido enquanto o redirect do useEffect
  // ainda não completou.
  if (!isAdminLike(tenant.active.role)) {
    return null;
  }

  return <>{children}</>;
}