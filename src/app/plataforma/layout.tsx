import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { PlataformaShell } from "./plataforma-shell";

// Diferente do layout de instituições (que depende de useTenant()),
// este layout não tem TenantProvider por baixo — é uma árvore de rota
// separada, sem nenhum conceito de "instituição ativa". É um Server
// Component: a checagem roda no servidor antes de qualquer HTML chegar.
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: isPlatformAdmin, error } = await supabase.rpc("is_platform_admin");

  if (error || !isPlatformAdmin) {
    redirect("/dashboard");
  }

  // Busca se o platform admin também é membro de alguma instituição
  // para exibir o link "Voltar para minha instituição" na barra superior.
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="platform-theme min-h-screen bg-background">
      <PlataformaShell
        userEmail={user.email ?? ""}
        hasMembership={!!membership}
        logoutButton={<AdminLogoutButton />}
      >
        {children}
      </PlataformaShell>
    </div>
  );
}
