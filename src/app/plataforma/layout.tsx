import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin-logout-button"; // componente criado abaixo

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Topbar isolada do Platform Admin */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>Platform Admin</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <AdminLogoutButton />
        </div>
      </header>

      {/* Conteúdo das páginas filhas */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
