"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AppRole } from "../roles";

export async function previewInviteAction(code: string) {
  const supabase = await createClient();
  const codeUpper = code.trim().toUpperCase();
  const { data: inv } = await supabase
    .from("invites")
    .select(
      "id, role, expires_at, used_at, single_use, institution_id, email, polo_ids, course_ids, institutions(name, city, state)",
    )
    .eq("code", codeUpper)
    .maybeSingle();

  if (!inv) return { found: false as const };
  const inst = inv.institutions as unknown as { name: string; city: string; state: string } | null;
  const expired = new Date(inv.expires_at).getTime() < Date.now();

  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const inviteCourses: string[] = Array.isArray(inv.course_ids) ? (inv.course_ids as string[]) : [];

  // Como role agora é obrigatório no convite, não precisamos pedir ao usuário final
  const needsRole = !inv.role;
  const role = inv.role as AppRole;

  // Checa se o papel exige e se já possui polos vinculados
  const requiresPolo = role === "coord_polo" || role === "tutor_presencial";
  const needsPolo = requiresPolo && !invitePolos.length;

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
    role,
    email: inv.email,
    expired,
    used: !!inv.used_at && inv.single_use,
    needsRole,
    needsPolo,
    polos,
  };
}

type RedeemInput = {
  code: string;
  role?: AppRole;
  polo_ids?: string[];
};

export async function redeemInviteAction(input: RedeemInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Instancia o Supabase Admin para ignorar o RLS durante a atribuição de permissões
  const { createClient: createSupabaseAdmin } = await import("@supabase/supabase-js");
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const code = input.code.trim().toUpperCase();

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
      throw new Error("Este convite foi enviado para outro e-mail");
    }
  }

  // O papel principal vem diretamente do convite
  const finalRole: AppRole = (inv.role as AppRole) || input.role;
  if (!finalRole) {
    throw new Error("Este convite não possui um papel configurado.");
  }

  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const rawPolos = invitePolos.length ? invitePolos : (input.polo_ids || []);
  const finalPolos = Array.from(new Set(rawPolos.filter((id): id is string => Boolean(id && typeof id === "string"))));

  const requiresPolo = finalRole === "coord_polo" || finalRole === "tutor_presencial";
  if (requiresPolo && finalPolos.length === 0) {
    throw new Error("Selecione ao menos um polo para continuar");
  }

  if (finalPolos.length) {
    const { data: polosOk } = await supabaseAdmin
      .from("polos")
      .select("id")
      .eq("institution_id", inv.institution_id)
      .in("id", finalPolos);

    if (!polosOk || polosOk.length !== finalPolos.length) {
      throw new Error("Polo selecionado é inválido para esta instituição");
    }
  }

  // Criação/Atualização da Membership
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
    if (memErr || !created) throw new Error(memErr?.message ?? "Falha ao criar vínculo de membro");
    membershipId = created.id;
  } else {
    const { error: updateMemError } = await supabaseAdmin
      .from("memberships")
      .update({ role: finalRole })
      .eq("id", membershipId);
    if (updateMemError) throw new Error(updateMemError.message);
  }

  // Vínculo com Cursos (Professor, Coordenador de Curso, Tutor a Distância)
  if (inv.course_ids?.length) {
    await supabaseAdmin.from("coordinator_courses").upsert(
      (inv.course_ids as string[]).map((cid: string) => ({
        membership_id: membershipId!,
        course_id: cid,
      })),
      { onConflict: "membership_id,course_id" },
    );
  }

  // Vínculo com Polos (Coordenador de Polo, Tutor Presencial)
  if (finalPolos.length) {
    const { error: upsertError } = await supabaseAdmin.from("coordinator_polos").upsert(
      finalPolos.map((pid: string) => ({
        membership_id: membershipId!,
        polo_id: pid,
      })),
      { onConflict: "membership_id,polo_id" },
    );
    if (upsertError) throw new Error(upsertError.message);
  } else {
    await supabaseAdmin
      .from("coordinator_polos")
      .delete()
      .eq("membership_id", membershipId!);
  }

  // Marcar como usado
  if (inv.single_use) {
    await supabaseAdmin
      .from("invites")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", inv.id);
  }

  // Histórico de auditoria
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

  revalidatePath("/(dashboard)", "layout");

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("memberships")
    .select("id, role, institution_id, institutions!inner(name, city, state, logo_url), coordinator_polos(polo_id)")
    .eq("user_id", user.id);

  if (membershipsError) {
    return { institutionId: inv.institution_id, updatedMemberships: null };
  }

  return { institutionId: inv.institution_id, updatedMemberships: membershipsData };
}
