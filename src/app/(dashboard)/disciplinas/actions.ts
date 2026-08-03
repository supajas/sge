"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// --- SCHEMAS DE VALIDAÇÃO ---

const subjectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  workload_hours: z.number().nullable().optional(),
  course_id: z.string().uuid(),
  period_id: z.string().uuid().nullable().optional(),
});

const bulkSubjectsSchema = z.array(
  z.object({
    name: z.string().min(1),
    workload_hours: z.number().nullable().optional(),
    course_id: z.string().uuid(),
    period_id: z.string().uuid().nullable().optional(),
  })
);

const toggleAllSchema = z.object({
  course_id: z.string().uuid(),
  period_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
});

const toggleSingleSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

// --- ACTIONS ---

/**
 * Salva ou atualiza uma única disciplina
 */
export async function saveSubjectAction(input: unknown) {
  const supabase = await createClient();
  const data = subjectSchema.parse(input);

  const { data: userResponse, error: userError } = await supabase.auth.getUser();
  if (userError || !userResponse.user) throw new Error("Usuário não autenticado.");

  // Recupera institution_id do perfil/contexto do usuário
  const { data: profile } = await supabase
    .from("profiles")
    .select("institution_id")
    .eq("id", userResponse.user.id)
    .single();

  const institution_id = profile?.institution_id;

  if (data.id) {
    const { error } = await supabase
      .from("subjects")
      .update({
        name: data.name,
        workload_hours: data.workload_hours,
        course_id: data.course_id,
        period_id: data.period_id,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("subjects").insert({
      name: data.name,
      workload_hours: data.workload_hours,
      course_id: data.course_id,
      period_id: data.period_id,
      institution_id,
      is_active: true,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/disciplinas");
  return { ok: true };
}

/**
 * Salva múltiplas disciplinas em lote (importação)
 */
export async function saveSubjectsBulkAction(input: unknown) {
  const supabase = await createClient();
  const items = bulkSubjectsSchema.parse(input);

  if (items.length === 0) return { ok: true, count: 0 };

  const { data: userResponse, error: userError } = await supabase.auth.getUser();
  if (userError || !userResponse.user) throw new Error("Usuário não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("institution_id")
    .eq("id", userResponse.user.id)
    .single();

  const payload = items.map((item) => ({
    ...item,
    institution_id: profile?.institution_id,
    is_active: true,
  }));

  const { error } = await supabase.from("subjects").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/disciplinas");
  return { ok: true, count: items.length };
}

/**
 * Exclui uma disciplina pelo ID
 */
export async function deleteSubjectAction(id: string) {
  const supabase = await createClient();

  if (!id) throw new Error("ID da disciplina inválido.");

  const { error } = await supabase.from("subjects").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/disciplinas");
  return { ok: true };
}

/**
 * Alterna a visibilidade (exibir/ocultar) de uma disciplina
 */
export async function toggleSubjectVisibilityAction(input: unknown) {
  const supabase = await createClient();
  const { id, is_active } = toggleSingleSchema.parse(input);

  const { error } = await supabase
    .from("subjects")
    .update({ is_active })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/disciplinas");
  return { ok: true };
}

/**
 * Alterna a visibilidade em massa de um curso/período
 */
export async function toggleAllSubjectsVisibilityAction(input: unknown) {
  const supabase = await createClient();
  const { course_id, period_id, is_active } = toggleAllSchema.parse(input);

  let query = supabase
    .from("subjects")
    .update({ is_active })
    .eq("course_id", course_id);

  if (period_id) {
    query = query.eq("period_id", period_id);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/disciplinas");
  return { ok: true };
}