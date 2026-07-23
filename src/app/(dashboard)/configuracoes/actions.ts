"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const deleteSchema = z.object({
  institution_id: z.string().uuid(),
});

export async function deleteInstitutionAction(input: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = deleteSchema.parse(input);

  // Authorize: only the owner can delete the institution
  const { data: inst, error: instErr } = await supabase
    .from("institutions")
    .select("owner_id")
    .eq("id", data.institution_id)
    .maybeSingle();

  if (instErr || !inst) {
    throw new Error("Instituição não encontrada.");
  }

  if (inst.owner_id !== user.id) {
    throw new Error("Apenas o proprietário (owner) pode excluir a instituição.");
  }

  // Perform deletion
  const { error: delErr } = await supabase.from("institutions").delete().eq("id", data.institution_id);
  if (delErr) {
    throw new Error(`Falha ao excluir a instituição: ${delErr.message}`);
  }

  revalidatePath("/onboarding");
  return { ok: true };
}
