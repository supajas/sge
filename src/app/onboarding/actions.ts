"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

  const supabase = createClient();
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
