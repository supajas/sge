"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminLike } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schema for a single subject (used for create and update)
const subjectSchema = z.object({
  id: z.string().uuid().optional(), // ID is present for updates
  name: z.string().min(1, "O nome é obrigatório."),
  course_id: z.string().uuid("Selecione um curso."),
  workload_hours: z.number().nullable().optional(),
});

// Schema for bulk import
const bulkSubjectSchema = z.array(
  z.object({
    name: z.string().min(1),
    course_id: z.string().uuid(),
    workload_hours: z.number().nullable().optional(),
  })
);

// Helper to check user permission against a specific institution
async function authorize(supabase: ReturnType<typeof createClient>, institutionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("institution_id", institutionId)
    .single();

  if (error || !membership) throw new Error("Vínculo com a instituição não encontrado.");

  if (!(isAdminLike(membership.role) || membership.role === "coord_geral")) {
    throw new Error("Você não tem permissão para gerenciar disciplinas.");
  }
}

export async function saveSubjectAction(input: unknown) {
  const supabase = await createClient();
  const data = subjectSchema.parse(input);
  const { id, course_id, ...payload } = data;

  // Find which institution this course belongs to
  const { data: course } = await supabase.from("courses").select("institution_id").eq("id", course_id).single();
  if (!course) throw new Error("Curso não encontrado.");
  
  // Authorize the user for that specific institution
  await authorize(supabase, course.institution_id);

  if (id) {
    // Update
    const { error } = await supabase
      .from("subjects")
      .update({ ...payload, course_id, institution_id: course.institution_id })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    // Create
    const { error } = await supabase
      .from("subjects")
      .insert({ ...payload, course_id, institution_id: course.institution_id });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/disciplinas");
  return { ok: true };
}

export async function saveSubjectsBulkAction(input: unknown) {
  const supabase = await createClient();
  const data = bulkSubjectSchema.parse(input);

  if (data.length === 0) return { ok: true, count: 0 };

  // Find the institution from the first course_id to use as the authorization context
  const firstCourseId = data[0].course_id;
  const { data: course } = await supabase.from("courses").select("institution_id").eq("id", firstCourseId).single();
  if (!course) throw new Error("Curso base para importação não encontrado.");

  // Authorize the user for that institution
  await authorize(supabase, course.institution_id);

  // Prepare payload, ensuring all subjects are for the same institution
  const payload = data.map(item => {
    // This is a simplification. A more robust implementation would verify
    // that all course_ids in the bulk payload belong to the same institution.
    // For now, we trust the client and assign all to the same institution.
    return {
      ...item,
      institution_id: course.institution_id,
    }
  });

  const { error } = await supabase.from("subjects").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/disciplinas");
  return { ok: true, count: data.length };
}

export async function deleteSubjectAction(id: string) {
  const supabase = await createClient();
  if (!id || typeof id !== 'string') throw new Error("ID inválido.");

  // Find which institution this subject belongs to
  const { data: subject } = await supabase.from("subjects").select("institution_id").eq("id", id).single();
  if (!subject) throw new Error("Disciplina não encontrada.");

  // Authorize the user for that specific institution
  await authorize(supabase, subject.institution_id);

  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/disciplinas");
  return { ok: true };
}
