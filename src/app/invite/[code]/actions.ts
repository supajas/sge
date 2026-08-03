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

export async function redeemInviteAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const role = formData.get("role") as "coord_geral" | "coord_polo" | null;
  const polo_ids = formData.getAll("polos") as string[];

  const { data: inv, error } = await supabase.from("invites").select("*").eq("code", code).maybeSingle();

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

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("institution_id", inv.institution_id)
    .maybeSingle();

  let membershipId = existing?.id ?? null;
  if (!membershipId) {
    const { data: created, error: memErr } = await supabase
      .from("memberships")
      .insert({ user_id: user.id, institution_id: inv.institution_id, role: finalRole })
      .select("id")
      .single();
    if (memErr || !created) throw new Error(memErr?.message ?? "Falha ao criar vínculo");
    membershipId = created.id;
  }

  if (inv.course_ids?.length) {
    await supabase.from("coordinator_courses").upsert(
      (inv.course_ids as string[]).map((cid: string) => ({
        membership_id: membershipId!,
        course_id: cid,
      })),
      { onConflict: "membership_id,course_id" },
    );
  }

  if (finalPolos.length) {
    await supabase.from("coordinator_polos").upsert(
      finalPolos.map((pid: string) => ({
        membership_id: membershipId!,
        polo_id: pid,
      })),
      { onConflict: "membership_id,polo_id" },
    );
  }

  if (inv.single_use) {
    await supabase.from("invites").update({ used_at: new Date().toISOString(), used_by: user.id }).eq("id", inv.id);
  }

  await supabase.from("approval_history").insert({
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
  return { institutionId: inv.institution_id };
}
