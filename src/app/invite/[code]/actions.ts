"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    return createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return null;
}

export async function previewInviteAction(code: string) {
  try {
    const supabaseUserClient = await createClient();
    const supabase = getAdminClient() ?? supabaseUserClient;

    const codeUpper = code.trim().toUpperCase();
    const { data: inv, error: invErr } = await supabase
      .from("invites")
      .select(
        "id, role, expires_at, used_at, single_use, institution_id, email, polo_ids, course_ids, institutions(name, city, state)"
      )
      .eq("code", codeUpper)
      .maybeSingle();

    if (invErr) {
      console.error("Erro ao consultar convite:", invErr);
      throw new Error("Erro ao buscar informações do convite.");
    }

    if (!inv) return { found: false as const };

    const inst = inv.institutions as unknown as { name: string; city: string; state: string } | null;
    const expired = new Date(inv.expires_at).getTime() < Date.now();

    const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
    const inviteCourses: string[] = Array.isArray(inv.course_ids) ? (inv.course_ids as string[]) : [];
    
    const role = (inv.role as string | null) ?? null;
    const requiresPolo = role === "coord_polo" || role === "tutor_presencial";
    const needsPolo = requiresPolo && !invitePolos.length;
    const needsRole = !role;

    let polos: { id: string; name: string }[] = [];
    if (needsPolo || requiresPolo) {
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
      invitePolos,
      inviteCourses,
      polos,
    };
  } catch (err: any) {
    console.error("Erro em previewInviteAction:", err);
    throw new Error(err.message || "Não foi possível carregar as informações do convite.");
  }
}

export type RedeemInviteInput = {
  code: string;
  role?: "coord_geral" | "coord_polo" | null;
  polo_ids?: string[];
};

export async function redeemInviteAction(input: RedeemInviteInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Você precisa estar autenticado para aceitar o convite.");
    }

    const code = input?.code?.trim().toUpperCase();
    const role = input?.role ?? null;
    const inputPolos = input?.polo_ids ?? [];

    if (!code) throw new Error("Código do convite não informado.");

    const supabaseAdmin = getAdminClient() ?? supabase;

    const { data: inv, error } = await supabaseAdmin
      .from("invites")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Convite não encontrado.");
    if (inv.used_at && inv.single_use) throw new Error("Este convite já foi utilizado.");
    if (new Date(inv.expires_at).getTime() < Date.now()) throw new Error("Este convite já expirou.");

    if (inv.email && user.email) {
      if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
        throw new Error(`Este convite foi enviado para ${inv.email}. Faça login com esta conta para aceitar.`);
      }
    }

    let finalRole: string | null = (inv.role as any) ?? null;
    if (!finalRole) {
      if (!role) throw new Error("Selecione o seu papel para continuar.");
      finalRole = role;
    }

    // Combina os polos salvos no convite com os selecionados na tela
    const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
    const rawPolos = inputPolos.length ? inputPolos : invitePolos;
    const finalPolos = Array.from(new Set(rawPolos.filter((id): id is string => Boolean(id && typeof id === "string"))));

    const inviteCourses: string[] = Array.isArray(inv.course_ids) ? (inv.course_ids as string[]) : [];

    if (finalRole === "coord_polo" && finalPolos.length === 0) {
      throw new Error("Selecione ao menos um polo.");
    }

    if (finalPolos.length) {
      const { data: polosOk } = await supabaseAdmin
        .from("polos")
        .select("id")
        .eq("institution_id", inv.institution_id)
        .in("id", finalPolos);
      if (!polosOk || polosOk.length !== finalPolos.length) throw new Error("Polo selecionado é inválido.");
    }

    // 1. Criar ou Buscar Membership
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
      if (memErr || !created) throw new Error(memErr?.message ?? "Falha ao criar vínculo com a instituição.");
      membershipId = created.id;
    } else {
      await supabaseAdmin
        .from("memberships")
        .update({ role: finalRole })
        .eq("id", membershipId);
    }

    // 2. Vínculo com Cursos (membership_courses)
    if (inviteCourses.length) {
      const courseRows = inviteCourses.map((cid: string) => ({
        membership_id: membershipId!,
        course_id: cid,
      }));
      const { error: courseErr } = await supabaseAdmin
        .from("membership_courses")
        .upsert(courseRows, { onConflict: "membership_id,course_id" });

      if (courseErr) console.error("Erro ao salvar membership_courses:", courseErr);
    }

    // 3. Vínculo com Polos (membership_polos)
    if (finalPolos.length) {
      const poloRows = finalPolos.map((pid: string) => ({
        membership_id: membershipId!,
        polo_id: pid,
      }));
      const { error: poloErr } = await supabaseAdmin
        .from("membership_polos")
        .upsert(poloRows, { onConflict: "membership_id,polo_id" });

      if (poloErr) console.error("Erro ao salvar membership_polos:", poloErr);
    }

    // 4. Marcar convite como utilizado
    if (inv.single_use) {
      await supabaseAdmin
        .from("invites")
        .update({ used_at: new Date().toISOString(), used_by: user.id })
        .eq("id", inv.id);
    }

    // 5. Histórico de aprovação
    const actorId = inv.created_by ?? user.id;
    await supabaseAdmin.from("approval_history").insert({
      institution_id: inv.institution_id,
      action: "invite_redeemed",
      actor_user_id: actorId,
      target_user_id: user.id,
      previous_role: null,
      new_role: finalRole,
      previous_polo_ids: [],
      new_polo_ids: finalPolos,
      metadata: { invite_id: inv.id, code },
    });

    const { data: updatedMemberships } = await supabaseAdmin
      .from("memberships")
      .select(`
        id,
        institution_id,
        role,
        institutions ( id, name, city, state, logo_url ),
        membership_polos ( polo_id ),
        membership_courses ( course_id )
      `)
      .eq("user_id", user.id);

    revalidatePath("/(dashboard)", "layout");
    return {
      institutionId: inv.institution_id,
      updatedMemberships: updatedMemberships ?? [],
    };
  } catch (err: any) {
    console.error("Erro em redeemInviteAction:", err);
    throw new Error(err.message || "Erro interno ao aceitar o convite.");
  }
}
