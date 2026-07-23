import { supabase } from "@/lib/supabase/client";

function generateCode(len = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

export type CreateInviteInput = {
  institution_id: string;
  email?: string | null;
  role?: "admin" | "coord_geral" | "coord_polo" | null;
  course_ids?: string[];
  polo_ids?: string[];
  expires_in_days?: number;
  single_use?: boolean;
};

export async function createInvite(data: CreateInviteInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Não autenticado");

  const { data: mem, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", data.institution_id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (memErr || !mem || (mem.role !== "owner" && mem.role !== "admin")) {
    throw new Error("Sem permissão para criar convite");
  }

  const expiresInDays = data.expires_in_days ?? 7;
  const expires = new Date(Date.now() + expiresInDays * 86400_000).toISOString();
  let code = generateCode();

  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from("invites")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
  }

  const { data: inv, error } = await supabase
    .from("invites")
    .insert({
      code,
      institution_id: data.institution_id,
      email: data.email ?? null,
      role: data.role ?? null,
      course_ids: data.course_ids ?? [],
      polo_ids: data.polo_ids ?? [],
      expires_at: expires,
      single_use: data.single_use ?? true,
      created_by: userData.user.id,
    })
    .select("id, code, expires_at")
    .single();

  if (error || !inv) throw new Error(error?.message ?? "Falha ao criar convite");
  return inv;
}

export async function redeemInvite(data: {
  code: string;
  role?: "coord_geral" | "coord_polo" | null;
  polo_ids?: string[];
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Não autenticado");
  const userId = userData.user.id;

  const code = data.code.trim().toUpperCase();

  const { data: inv, error } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!inv) throw new Error("Convite não encontrado");
  if (inv.used_at && inv.single_use) throw new Error("Convite já utilizado");
  if (new Date(inv.expires_at).getTime() < Date.now()) throw new Error("Convite expirado");

  if (inv.email && userData.user.email) {
    if (userData.user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new Error("Este convite foi enviado para outro email");
    }
  }

  const providedRole = data.role ?? null;
  let finalRole: "admin" | "coord_geral" | "coord_polo" | null = (inv.role as
    | "admin"
    | "coord_geral"
    | "coord_polo"
    | null) ?? null;

  if (!finalRole) {
    if (!providedRole) throw new Error("Selecione o seu papel para continuar");
    if (providedRole !== "coord_geral" && providedRole !== "coord_polo") {
      throw new Error("Papel inválido");
    }
    finalRole = providedRole;
  }

  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const providedPolos: string[] = data.polo_ids ?? [];
  const finalPolos = invitePolos.length ? invitePolos : providedPolos;

  if (finalRole === "coord_polo" && finalPolos.length === 0) {
    throw new Error("Selecione ao menos um polo");
  }

  if (finalPolos.length) {
    const { data: polosOk } = await supabase
      .from("polos")
      .select("id")
      .eq("institution_id", inv.institution_id)
      .in("id", finalPolos);
    if (!polosOk || polosOk.length !== finalPolos.length) {
      throw new Error("Polo inválido");
    }
  }

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("institution_id", inv.institution_id)
    .maybeSingle();

  let membershipId = existing?.id ?? null;
  if (!membershipId) {
    const { data: created, error: memErr } = await supabase
      .from("memberships")
      .insert({
        user_id: userId,
        institution_id: inv.institution_id,
        role: finalRole,
      })
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
    await supabase
      .from("invites")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", inv.id);
  }

  await supabase.from("approval_history").insert({
    institution_id: inv.institution_id,
    action: "invite_redeemed",
    actor_user_id: inv.created_by,
    target_user_id: userId,
    previous_role: null,
    new_role: finalRole,
    previous_polo_ids: [],
    new_polo_ids: finalPolos,
    metadata: { invite_id: inv.id, code },
  });

  return { institutionId: inv.institution_id };
}

export async function previewInvite(data: { code: string }) {
  const code = data.code.trim().toUpperCase();
  const { data: inv } = await supabase
    .from("invites")
    .select(
      "id, role, expires_at, used_at, single_use, institution_id, email, polo_ids, institutions(name, city, state)",
    )
    .eq("code", code)
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
