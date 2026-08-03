"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function previewInviteAction(code: string) {
  const supabase = await createClient();
  const codeUpper = code.trim().toUpperCase();
  const { data: inv } = await supabase
    .from("invites")
    .select(
      "id, role, expires_at, used_at, single_use, institution_id, email, polo_ids, institutions(name, city, state)",
    )
    .eq("code", codeUpper)
    .maybeSingle();

  if (!inv) return { found: false as const };
  const inst = inv.institutions as unknown as { name: string; city: string; state: string } | null;
  const expired = new Date(inv.expires_at).getTime() < Date.now();

  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const needsPolo = !invitePolos.length;
  const needsRole = !inv.role;

  let polos: { id: string; name: string }[] = [];
  if (needsPolo) {
    const { data: p } = await supabase
      .from("polos")
      .select("id, name")
      .eq("institution_id", inv.institution_id)
      .order("name");
    polos = p ?? [];
  }

  return {
    found: true as const,
    institutionName: inst?.name ?? "",
    institutionCity: inst?.city ?? "",
    institutionState: inst?.state ?? "",
    role: (inv.role as string | null) ?? null,
    email: inv.email,
    expired,
    used: !!inv.used_at && inv.single_use,
    needsRole,
    needsPolo,
    polos,
  };
}

export type RedeemInviteInput = {
  code: string;
  role?: "coord_geral" | "coord_polo" | null;
  polo_ids?: string[];
};

export async function redeemInviteAction(input: RedeemInviteInput | FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Normalização de entrada (Suporta tanto chamada via JSON/Mutation quanto via FormData)
  let code = "";
  let role: "coord_geral" | "coord_polo" | null = null;
  let polo_ids: string[] = [];

  if (input instanceof FormData) {
    code = (input.get("code") as string)?.trim().toUpperCase();
    role = input.get("role") as "coord_geral" | "coord_polo" | null;
    polo_ids = input.getAll("polos") as string[];
  } else {
    code = input.code?.trim().toUpperCase();
    role = input.role ?? null;
    polo_ids = input.polo_ids ?? [];
  }

  if (!code) throw new Error("Código do convite não informado");

  // 1. Validações seguras com o cliente autenticado do usuário
  const { data: inv, error } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!inv) throw new Error("Convite não encontrado");
  if (inv.used_at && inv.single_use) throw new Error("Convite já utilizado");
  if (new Date(inv.expires_at).getTime() < Date.now()) throw new Error("Convite expirado");

  if (inv.email && user.email) {
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new Error("Este convite foi enviado para outro email");
    }
  }

  let finalRole: "admin" | "coord_geral" | "coord_polo" | null = (inv.role as any) ?? null;
  if (!finalRole) {
    if (!role) throw new Error("Selecione o seu papel para continuar");
    if (role !== "coord_geral" && role !== "coord_polo") throw new Error("Papel inválido");
    finalRole = role;
  }

  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const finalPolos = invitePolos.length ? invitePolos : polo_ids;

  if (finalRole === "coord_polo" && finalPolos.length === 0) {
    throw new Error("Selecione ao menos um polo");
  }

  if (finalPolos.length) {
    const { data: polosOk } = await supabase
      .from("polos")
      .select("id")
      .eq("institution_id", inv.institution_id)
      .in("id", finalPolos);
    if (!polosOk || polosOk.length !== finalPolos.length) throw new Error("Polo inválido");
  }

  // 2. Instanciação do Cliente Admin para bypass das restrições de RLS
  const { createClient: createSupabaseAdmin } = await import("@supabase/supabase-js");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Chave SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente Server.");
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  // 3. Execução das modificações no banco com permissão elevada
  const { data: existing } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("institution_id", inv.institution_id)
    .maybeSingle();

  let membershipId = existing?.id ?? null;
  if (!membershipId) {
    const { data: created, error: memErr } = await supabaseAdmin
      .from("memberships")
      .insert({ user_id: user.id, institution_id: inv.institution_id, role: finalRole })
      .select("id")
      .single();
    if (memErr || !created) throw new Error(memErr?.message ?? "Falha ao criar vínculo");
    membershipId = created.id;
  }

  if (inv.course_ids?.length) {
    await supabaseAdmin.from("coordinator_courses").upsert(
      (inv.course_ids as string[]).map((cid: string) => ({
        membership_id: membershipId!,
        course_id: cid,
      })),
      { onConflict: "membership_id,course_id" },
    );
  }

  if (finalPolos.length) {
    await supabaseAdmin.from("coordinator_polos").upsert(
      finalPolos.map((pid: string) => ({
        membership_id: membershipId!,
        polo_id: pid,
      })),
      { onConflict: "membership_id,polo_id" },
    );
  }

  if (inv.single_use) {
    await supabaseAdmin
      .from("invites")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", inv.id);
  }

  await supabaseAdmin.from("approval_history").insert({
    institution_id: inv.institution_id,
    action: "invite_redeemed",
    actor_user_id: inv.created_by,
    target_user_id: user.id,
    previous_role: null,
    new_role: finalRole,
    previous_polo_ids: [],
    new_polo_ids: finalPolos,
    metadata: { invite_id: inv.id, code },
  });

  // 4. Busca os vínculos atualizados do usuário para devolver à página
  const { data: updatedMemberships } = await supabaseAdmin
    .from("memberships")
    .select(`
      id,
      institution_id,
      role,
      institutions ( id, name, city, state, logo_url ),
      coordinator_polos ( polo_id )
    `)
    .eq("user_id", user.id);

  revalidatePath("/(dashboard)", "layout");
  return { 
    institutionId: inv.institution_id,
    updatedMemberships: updatedMemberships ?? []
  };
}
