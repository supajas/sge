"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum(["admin", "coord_geral", "coord_polo"]),
  polo_ids: z.array(z.string().uuid()).default([]),
});

export async function updateMembershipAction(input: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = updateSchema.parse(input);

  // Load target membership
  const { data: target, error: tErr } = await supabase
    .from("memberships")
    .select("id, user_id, role, institution_id")
    .eq("id", data.membership_id)
    .maybeSingle();
  if (tErr || !target) throw new Error("Vínculo não encontrado");
  if (target.role === "owner") throw new Error("O owner não pode ser alterado");

  // Authorize caller (owner/admin of the same institution)
  const { data: caller } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", target.institution_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Sem permissão para executar esta ação.");
  }

  // Previous polos
  const { data: prevRows } = await supabase
    .from("coordinator_polos")
    .select("polo_id")
    .eq("membership_id", target.id);
  const previousPolos = (prevRows ?? []).map((r) => r.polo_id);

  // Validate polos belong to same institution
  const nextPolos = data.role === "coord_polo" ? data.polo_ids : [];
  if (nextPolos.length) {
    const { data: ok, error } = await supabase
      .from("polos")
      .select("id")
      .eq("institution_id", target.institution_id)
      .in("id", nextPolos);
    if (error || !ok || ok.length !== nextPolos.length) throw new Error("Um ou mais polos são inválidos.");
  }

  const roleChanged = target.role !== data.role;

  // Update role
  if (roleChanged) {
    const { error: uErr } = await supabase
      .from("memberships")
      .update({ role: data.role })
      .eq("id", target.id);
    if (uErr) throw new Error(uErr.message);
  }

  // Reset polos to the new set
  const toAdd = nextPolos.filter((p) => !previousPolos.includes(p));
  const toRemove = previousPolos.filter((p) => !nextPolos.includes(p));

  if (toRemove.length) {
    await supabase
      .from("coordinator_polos")
      .delete()
      .eq("membership_id", target.id)
      .in("polo_id", toRemove);
  }
  if (toAdd.length) {
    await supabase
      .from("coordinator_polos")
      .upsert(
        toAdd.map((polo_id) => ({ membership_id: target.id, polo_id })),
        { onConflict: "membership_id,polo_id" },
      );
  }

  const polosChanged = toAdd.length > 0 || toRemove.length > 0;

  // Log history
  if (roleChanged || polosChanged) {
    await supabase.from("approval_history").insert({
      institution_id: target.institution_id,
      action: roleChanged ? "role_changed" : "polos_changed",
      actor_user_id: user.id,
      target_user_id: target.user_id,
      previous_role: target.role,
      new_role: data.role,
      previous_polo_ids: previousPolos,
      new_polo_ids: nextPolos,
    });
  }
  
  revalidatePath("/colaboradores");
  return { ok: true };
}

const removeSchema = z.object({ membership_id: z.string().uuid() });

export async function removeMembershipAction(input: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = removeSchema.parse(input);

  const { data: target } = await supabase
    .from("memberships")
    .select("id, user_id, role, institution_id")
    .eq("id", data.membership_id)
    .maybeSingle();
  if (!target) throw new Error("Vínculo não encontrado");
  if (target.role === "owner") throw new Error("O owner não pode ser removido");

  const { data: caller } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", target.institution_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Sem permissão para executar esta ação.");
  }

  const { data: prevRows } = await supabase
    .from("coordinator_polos")
    .select("polo_id")
    .eq("membership_id", target.id);
  const previousPolos = (prevRows ?? []).map((r) => r.polo_id);

  const { error } = await supabase.from("memberships").delete().eq("id", target.id);
  if (error) throw new Error(error.message);

  await supabase.from("approval_history").insert({
    institution_id: target.institution_id,
    action: "removed",
    actor_user_id: user.id,
    target_user_id: target.user_id,
    previous_role: target.role,
    new_role: null,
    previous_polo_ids: previousPolos,
    new_polo_ids: [],
  });

  revalidatePath("/colaboradores");
  return { ok: true };
}
