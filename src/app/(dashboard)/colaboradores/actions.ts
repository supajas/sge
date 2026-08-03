"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum([
    "admin",
    "coord_geral",
    "secretaria",
    "coord_curso",
    "coord_polo",
    "professor",
    "tutor_presencial",
    "tutor_distancia",
  ]),
  polo_ids: z.array(z.string().uuid()).default([]).transform((ids) => [...new Set(ids)]),
  course_ids: z.array(z.string().uuid()).default([]).transform((ids) => [...new Set(ids)]),
});

export async function updateMembershipAction(input: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = updateSchema.parse(input);

  // 1. Carrega membership alvo
  const { data: target, error: tErr } = await supabase
    .from("memberships")
    .select("id, user_id, role, institution_id")
    .eq("id", data.membership_id)
    .maybeSingle();

  if (tErr || !target) throw new Error("Vínculo não encontrado");
  if (target.role === "owner") throw new Error("O owner não pode ser alterado");

  // 2. Autorização do chamador
  const { data: caller } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", target.institution_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Sem permissão para executar esta ação.");
  }

  // 3. Vínculos do formulário
  const nextPolos = data.polo_ids;
  const nextCourses = data.course_ids;

  // 4. Validação de pertencimento à instituição
  if (nextPolos.length) {
    const { data: ok, error } = await supabase
      .from("polos")
      .select("id")
      .eq("institution_id", target.institution_id)
      .in("id", nextPolos);

    if (error || !ok || ok.length !== nextPolos.length) {
      throw new Error("Um ou mais polos selecionados são inválidos.");
    }
  }

  if (nextCourses.length) {
    const { data: ok, error } = await supabase
      .from("courses")
      .select("id")
      .eq("institution_id", target.institution_id)
      .in("id", nextCourses);

    if (error || !ok || ok.length !== nextCourses.length) {
      throw new Error("Um ou mais cursos selecionados são inválidos.");
    }
  }

  // 5. Atualização de Role se houver alteração
  const roleChanged = target.role !== data.role;
  if (roleChanged) {
    const { error: uErr } = await supabase
      .from("memberships")
      .update({ role: data.role })
      .eq("id", target.id);

    if (uErr) throw new Error(`Erro ao atualizar role: ${uErr.message}`);
  }

  // 6. Atualização de Polos (membership_polos)
  const { data: prevPoloRows } = await supabase
    .from("membership_polos")
    .select("polo_id")
    .eq("membership_id", target.id);

  const previousPolos = (prevPoloRows ?? []).map((r) => r.polo_id);
  const polosToAdd = nextPolos.filter((p) => !previousPolos.includes(p));
  const polosToRemove = previousPolos.filter((p) => !nextPolos.includes(p));

  if (polosToRemove.length) {
    const { error } = await supabase
      .from("membership_polos")
      .delete()
      .eq("membership_id", target.id)
      .in("polo_id", polosToRemove);

    if (error) throw new Error(`Erro ao remover polos: ${error.message}`);
  }

  if (polosToAdd.length) {
    const poloPayload = polosToAdd.map((polo_id) => ({ membership_id: target.id, polo_id }));
    const { error } = await supabase.from("membership_polos").insert(poloPayload);

    if (error) throw new Error(`Erro ao inserir polos: ${error.message}`);
  }

  // 7. Atualização de Cursos (membership_courses)
  const { data: prevCourseRows } = await supabase
    .from("membership_courses")
    .select("course_id")
    .eq("membership_id", target.id);

  const previousCourses = (prevCourseRows ?? []).map((r) => r.course_id);
  const coursesToAdd = nextCourses.filter((c) => !previousCourses.includes(c));
  const coursesToRemove = previousCourses.filter((c) => !nextCourses.includes(c));

  if (coursesToRemove.length) {
    const { error } = await supabase
      .from("membership_courses")
      .delete()
      .eq("membership_id", target.id)
      .in("course_id", coursesToRemove);

    if (error) throw new Error(`Erro ao remover cursos: ${error.message}`);
  }

  if (coursesToAdd.length) {
    const coursePayload = coursesToAdd.map((course_id) => ({ membership_id: target.id, course_id }));
    const { error } = await supabase.from("membership_courses").insert(coursePayload);

    if (error) throw new Error(`Erro ao inserir cursos: ${error.message}`);
  }

  // 8. Registro de Histórico
  const vinculosChanged =
    polosToAdd.length > 0 ||
    polosToRemove.length > 0 ||
    coursesToAdd.length > 0 ||
    coursesToRemove.length > 0;

  if (roleChanged || vinculosChanged) {
    let actionType = "bindings_changed";
    if (roleChanged && vinculosChanged) actionType = "role_and_bindings_changed";
    else if (roleChanged) actionType = "role_changed";

    await supabase.from("approval_history").insert({
      institution_id: target.institution_id,
      action: actionType,
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
    .from("membership_polos")
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