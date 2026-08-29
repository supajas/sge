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
// página. Nunca confiar só na guarda de navegação para uma ação que usa
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

// =============================================================================
// Visão geral (/plataforma)
// =============================================================================

export type PlatformOverview = {
  totalInstitutions: number;
  totalUsers: number;
  recentInstitutions: { id: string; name: string; city: string | null; state: string | null; created_at: string }[];
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
      .select("id, name, city, state, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (institutionsCount.error) throw new Error(institutionsCount.error.message);
  if (usersCount.error) throw new Error(usersCount.error.message);
  if (recent.error) throw new Error(recent.error.message);

  return {
    totalInstitutions: institutionsCount.count ?? 0,
    totalUsers: usersCount.count ?? 0,
    recentInstitutions: recent.data ?? [],
  };
}

// =============================================================================
// Lista de instituições (/plataforma/instituicoes)
// =============================================================================

export type InstitutionListItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
  memberCount: number;
};

export async function listInstitutionsAction(query?: string): Promise<InstitutionListItem[]> {
  await assertPlatformAdmin();

  const admin = getAdminClient();
  if (!admin) throw new Error("Configuração de servidor ausente (service role).");

  let q = admin
    .from("institutions")
    .select("id, name, city, state, created_at, memberships(id)")
    .order("created_at", { ascending: false });

  if (query) {
    q = q.ilike("name", `%${query}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((inst) => ({
    id: inst.id,
    name: inst.name,
    city: inst.city,
    state: inst.state,
    created_at: inst.created_at,
    memberCount: Array.isArray(inst.memberships) ? inst.memberships.length : 0,
  }));
}

// =============================================================================
// Drill-down de uma instituição (/plataforma/instituicoes/[id])
// =============================================================================

export type InstitutionDetail = {
  institution: { id: string; name: string; city: string | null; state: string | null; created_at: string };
  members: { id: string; name: string; email: string; role: string }[];
  counts: { polos: number; courses: number; classes: number; students: number };
};

export async function getInstitutionDetailAction(institutionId: string): Promise<InstitutionDetail | null> {
  const user = await assertPlatformAdmin();

  const admin = getAdminClient();
  if (!admin) throw new Error("Configuração de servidor ausente (service role).");

  const institutionRes = await admin
    .from("institutions")
    .select("id, name, city, state, created_at")
    .eq("id", institutionId)
    .maybeSingle();

  if (institutionRes.error) throw new Error(institutionRes.error.message);
  if (!institutionRes.data) return null;

  const [membersRes, poloRes, courseRes, classRes, studentRes] = await Promise.all([
    admin
      .from("memberships")
      .select("id, role, profiles!inner(full_name, email)")
      .eq("institution_id", institutionId),
    admin.from("polos").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
    admin.from("courses").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
    admin.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
    admin.from("students").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);

  await admin.from("platform_audit_log").insert({
    actor_user_id: user.id,
    action: "view_institution_detail",
    target_institution_id: institutionId,
  });

  return {
    institution: institutionRes.data,
    members: (membersRes.data ?? []).map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.id,
        name: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        role: m.role,
      };
    }),
    counts: {
      polos: poloRes.count ?? 0,
      courses: courseRes.count ?? 0,
      classes: classRes.count ?? 0,
      students: studentRes.count ?? 0,
    },
  };
}
