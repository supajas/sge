import { supabase } from "@/lib/supabase/client";

export type UpdateMembershipInput = {
  membership_id: string;
  role: "admin" | "coord_geral" | "coord_polo";
  polo_ids?: string[];
};

export async function updateMembership(data: UpdateMembershipInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Não autenticado");
  const userId = userData.user.id;

  const { data: target, error: tErr } = await supabase
    .from("memberships")
    .select("id, user_id, role, institution_id")
    .eq("id", data.membership_id)
    .maybeSingle();

  if (tErr || !target) throw new Error("Vínculo não encontrado");
  if (target.role === "owner") throw new Error("O owner não pode ser alterado");

  const { data: caller } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", target.institution_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Sem permissão");
  }

  const { data: prevRows } = await supabase
    .from("coordinator_polos")
    .select("polo_id")
    .eq("membership_id", target.id);
  const previousPolos = (prevRows ?? []).map((r) => r.polo_id);

  const nextPolos = data.role === "coord_polo" ? (data.polo_ids ?? []) : [];
  if (nextPolos.length) {
    const { data: ok } = await supabase
      .from("polos")
      .select("id")
      .eq("institution_id", target.institution_id)
      .in("id", nextPolos);
    if (!ok || ok.length !== nextPolos.length) throw new Error("Polo inválido");
  }

  const roleChanged = target.role !== data.role;

  if (roleChanged) {
    const { error: uErr } = await supabase
      .from("memberships")
      .update({ role: data.role })
      .eq("id", target.id);
    if (uErr) throw new Error(uErr.message);
  }

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

  if (roleChanged) {
    await supabase.from("approval_history").insert({
      institution_id: target.institution_id,
      action: "role_changed",
      actor_user_id: userId,
      target_user_id: target.user_id,
      previous_role: target.role,
      new_role: data.role,
      previous_polo_ids: previousPolos,
      new_polo_ids: nextPolos,
    });
  }

  if (polosChanged && !roleChanged) {
    await supabase.from("approval_history").insert({
      institution_id: target.institution_id,
      action: "polos_changed",
      actor_user_id: userId,
      target_user_id: target.user_id,
      previous_role: target.role,
      new_role: data.role,
      previous_polo_ids: previousPolos,
      new_polo_ids: nextPolos,
    });
  }

  return { ok: true };
}

export async function removeMembership(data: { membership_id: string }) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Não autenticado");
  const userId = userData.user.id;

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
    .eq("user_id", userId)
    .maybeSingle();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Sem permissão");
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
    actor_user_id: userId,
    target_user_id: target.user_id,
    previous_role: target.role,
    new_role: null,
    previous_polo_ids: previousPolos,
    new_polo_ids: [],
  });

  return { ok: true };
}
