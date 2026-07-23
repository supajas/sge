"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppRole } from "@/lib/roles";

// --- From institutions.functions.ts ---

const createInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  logo_url: z.preprocess(
    (val) => (val === "" ? null : val), // Treat empty string as null
    z.string().url("URL inválida").optional().nullable()
  ),
});

export async function bootstrapInstitutionAction(input: unknown) {
  // TODO: Add subscription check here.
  // e.g., check if user is on a paid plan or has a trial.
  // If they are on a free plan and already have an institution, throw an error.

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = createInstitutionSchema.parse(input);

  // 1. Cria a instituição
  const { data: inst, error: instErr } = await supabase
    .from("institutions")
    .insert({
      name: data.name,
      city: data.city,
      state: data.state,
      logo_url: data.logo_url ?? null,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (instErr || !inst) throw new Error(instErr?.message ?? "Falha ao criar instituição");

  // 2. Garante o vínculo na tabela memberships usando UPSERT
  // O 'onConflict' impede o erro 500 caso a trigger do Postgres já tenha criado o vinculo
  const { error: memErr } = await supabase
    .from("memberships")
    .upsert(
      {
        user_id: user.id,
        institution_id: inst.id,
        role: "owner",
      },
      {
        onConflict: "user_id,institution_id",
      }
    );

  if (memErr) {
    // rollback em caso de falha real de escrita
    await supabase.from("institutions").delete().eq("id", inst.id);
    throw new Error(memErr.message);
  }

  revalidatePath("/onboarding");
  return { institutionId: inst.id };
}


// --- From invites.functions.ts ---

function generateCode(len = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const redeemSchema = z.object({
  code: z.string().trim().min(4).max(32),
  role: z.enum(["coord_geral", "coord_polo"]).nullable().optional(),
  polo_ids: z.array(z.string().uuid()).default([]).optional(),
});

export async function redeemInviteAction(input: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = redeemSchema.parse(input);
  const code = data.code.trim().toUpperCase();

  const { data: inv, error } = await supabase.from("invites").select("*").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!inv) throw new Error("Convite não encontrado");
  if (inv.used_at && inv.single_use) throw new Error("Convite já utilizado");
  if (new Date(inv.expires_at).getTime() < Date.now()) throw new Error("Convite expirado");

  if (inv.email && user.email && user.email.toLowerCase() !== inv.email.toLowerCase()) {
    throw new Error("Este convite foi enviado para outro email");
  }

  const providedRole = data.role ?? null;
  let finalRole: AppRole | null = (inv.role as AppRole | null) ?? null;
  if (!finalRole) {
    if (!providedRole) throw new Error("Selecione o seu papel para continuar");
    if (providedRole !== "coord_geral" && providedRole !== "coord_polo") throw new Error("Papel inválido");
    finalRole = providedRole;
  }

  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const providedPolos: string[] = data.polo_ids ?? [];
  const finalPolos = invitePolos.length ? invitePolos : providedPolos;

  if (finalRole === "coord_polo" && finalPolos.length === 0) {
    throw new Error("Selecione ao menos um polo");
  }

  if (finalPolos.length) {
    const { data: polosOk } = await supabase.from("polos").select("id").eq("institution_id", inv.institution_id).in("id", finalPolos);
    if (!polosOk || polosOk.length !== finalPolos.length) throw new Error("Polo inválido");
  }

  const { data: existing } = await supabase.from("memberships").select("id").eq("user_id", user.id).eq("institution_id", inv.institution_id).maybeSingle();
  let membershipId = existing?.id ?? null;
  if (!membershipId) {
    const { data: created, error: memErr } = await supabase.from("memberships").insert({ user_id: user.id, institution_id: inv.institution_id, role: finalRole }).select("id").single();
    if (memErr || !created) throw new Error(memErr?.message ?? "Falha ao criar vínculo");
    membershipId = created.id;
  }

  if (finalPolos.length) {
    await supabase.from("coordinator_polos").upsert(finalPolos.map((pid: string) => ({ membership_id: membershipId!, polo_id: pid })), { onConflict: "membership_id,polo_id" });
  }

  if (inv.single_use) {
    await supabase.from("invites").update({ used_at: new Date().toISOString(), used_by: user.id }).eq("id", inv.id);
  }

  await supabase.from("approval_history").insert({
    institution_id: inv.institution_id,
    action: "invite_redeemed",
    actor_user_id: inv.created_by,
    target_user_id: user.id,
    new_role: finalRole,
    new_polo_ids: finalPolos,
    metadata: { invite_id: inv.id, code },
  });

  revalidatePath("/onboarding");
  return { institutionId: inv.institution_id };
}

const previewSchema = z.object({ code: z.string().trim().min(4).max(32) });

export async function previewInviteAction(input: unknown) {
  const supabase = await createClient();
  const data = previewSchema.parse(input);
  const code = data.code.trim().toUpperCase();
  const { data: inv } = await supabase.from("invites").select("id, role, expires_at, used_at, single_use, institution_id, email, polo_ids, institutions(name, city, state)").eq("code", code).maybeSingle();
  if (!inv) return { found: false as const };

  const inst = inv.institutions as { name: string; city: string; state: string } | null;
  const expired = new Date(inv.expires_at).getTime() < Date.now();
  const invitePolos: string[] = Array.isArray(inv.polo_ids) ? (inv.polo_ids as string[]) : [];
  const needsPolo = !invitePolos.length;
  const needsRole = !inv.role;

  let polos: { id: string; name: string }[] = [];
  if (needsPolo) {
    const { data: p } = await supabase.from("polos").select("id, name").eq("institution_id", inv.institution_id).order("name");
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
