"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Confirma que quem chama é platform admin. O layout.tsx já faz essa
// checagem na navegação — isso aqui é defesa em profundidade: uma Server
// Action pode, em tese, ser invocada sem passar pela renderização da
// página (ex: alguém com o bundle do client tentando chamar a action
// direto). Nunca confiar só na guarda de navegação para uma ação que usa
// service_role.
async function assertPlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: isPlatformAdmin, error } = await supabase.rpc("is_platform_admin");
  if (error || !isPlatformAdmin) throw new Error("Acesso restrito a administradores da plataforma.");

  return user;
}

export type PlatformOverview = {
  totalInstitutions: number;
  totalUsers: number;
  recentInstitutions: { id: string; name: string; created_at: string }[];
};

export async function getPlatformOverviewAction(): Promise<PlatformOverview> {
  await assertPlatformAdmin();

  const admin = getAdminClient();
  if (!admin) throw new Error("Configuração de servidor ausente (service role).");

  const [institutionsCount, usersCount, recent] = await Promise.all([
    admin.from("institutions").select("id", { count: "exact", head: true }),
    admin.from("memberships").select("user_id", { count: "exact", head: true }),
    admin
      .from("institutions")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (institutionsCount.error) throw new Error(institutionsCount.error.message);
  if (usersCount.error) throw new Error(usersCount.error.message);
  if (recent.error) throw new Error(recent.error.message);

  return {
    totalInstitutions: institutionsCount.count ?? 0,
    // Nota: isso conta memberships, não usuários únicos (uma pessoa com
    // duas instituições conta duas vezes aqui). Refinar para count(DISTINCT
    // user_id) fica para quando a página de /plataforma/usuarios for
    // construída de verdade — por ora é só uma métrica aproximada de visão
    // geral, não uma fonte de verdade.
    totalUsers: usersCount.count ?? 0,
    recentInstitutions: recent.data ?? [],
  };
}
