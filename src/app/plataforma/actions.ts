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

// -----------------------------------------------------------------------------
// ADICIONAR ao final de src/app/plataforma/actions.ts (não substitui nada
// existente — soma duas funções novas ao arquivo que você já tem).
// -----------------------------------------------------------------------------

// =============================================================================
// Busca de usuários (/plataforma/usuarios) — só leitura, nunca concede ou
// revoga platform admin (essa decisão continua travada, só via SQL Editor —
// ver migration da Parte 3.1). Toda busca bem-sucedida grava no audit log:
// ver e-mail + vínculos institucionais de alguém é dado sensível o
// suficiente para registrar, mesmo sendo leitura.
// =============================================================================

export type UserSearchResult = {
  id: string;
  email: string;
  createdAt: string;
  isPlatformAdmin: boolean;
  memberships: { institutionId: string; institutionName: string; role: string }[];
};

export async function searchUsersAction(query: string): Promise<UserSearchResult[]> {
  const actor = await assertPlatformAdmin();

  const admin = getAdminClient();
  if (!admin) throw new Error("Configuração de servidor ausente (service role).");

  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // auth.users não é consultável via PostgREST direto — usa a Admin Auth
  // API e filtra em memória (mesmo padrão já usado no script de bootstrap
  // de senha de automação).
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(listError.message);

  const matched = usersPage.users.filter((u) =>
    u.email?.toLowerCase().includes(trimmed.toLowerCase())
  );
  if (matched.length === 0) return [];

  const userIds = matched.map((u) => u.id);

  const [membershipsRes, platformAdminsRes] = await Promise.all([
    admin.from("memberships").select("user_id, role, institutions(id, name)").in("user_id", userIds),
    admin.from("platform_admins").select("user_id").in("user_id", userIds),
  ]);

  if (membershipsRes.error) throw new Error(membershipsRes.error.message);
  if (platformAdminsRes.error) throw new Error(platformAdminsRes.error.message);

  const platformAdminIds = new Set((platformAdminsRes.data ?? []).map((p: any) => p.user_id));

  await admin.from("platform_audit_log").insert({
    actor_user_id: actor.id,
    action: "search_users",
    metadata: { query: trimmed, result_count: matched.length },
  });

  return matched.map((u) => ({
    id: u.id,
    email: u.email ?? "—",
    createdAt: u.created_at,
    isPlatformAdmin: platformAdminIds.has(u.id),
    memberships: (membershipsRes.data ?? [])
      .filter((m: any) => m.user_id === u.id)
      .map((m: any) => ({
        institutionId: m.institutions?.id ?? "",
        institutionName: m.institutions?.name ?? "—",
        role: m.role,
      })),
  }));
}

// =============================================================================
// Log de auditoria (/plataforma/logs) — leitor do platform_audit_log.
// DELIBERADAMENTE não é um log de infraestrutura (erros 500, deploys,
// tentativas de login) — isso já é melhor coberto por Vercel Logs/Supabase
// Logs. Isto aqui é só a trilha de "qual platform admin viu o quê", que só
// existe porque a construímos de propósito.
// =============================================================================

export type AuditLogEntry = {
  id: string;
  actorEmail: string;
  action: string;
  targetInstitutionName: string | null;
  targetUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function getPlatformAuditLogAction(limit = 50): Promise<AuditLogEntry[]> {
  await assertPlatformAdmin();

  const admin = getAdminClient();
  if (!admin) throw new Error("Configuração de servidor ausente (service role).");

  const { data: logs, error } = await admin
    .from("platform_audit_log")
    .select("id, actor_user_id, action, target_institution_id, target_user_id, metadata, created_at, institutions(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!logs || logs.length === 0) return [];

  // Resolve e-mail de quem agiu — mesmo motivo/padrão do searchUsersAction:
  // auth.users não é consultável via PostgREST, só via Admin Auth API.
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email ?? "—"]));

  return logs.map((l: any) => ({
    id: l.id,
    actorEmail: emailById.get(l.actor_user_id) ?? "—",
    action: l.action,
    targetInstitutionName: l.institutions?.name ?? null,
    targetUserId: l.target_user_id,
    metadata: l.metadata,
    createdAt: l.created_at,
  }));
}
