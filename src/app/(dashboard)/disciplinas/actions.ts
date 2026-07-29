"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server"; // ajuste conforme seu cliente do Supabase no server

// Schema para autorização/validação se necessário
const toggleAllSchema = z.object({
  course_id: z.string().uuid(),
  period_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
});

const toggleSingleSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

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
