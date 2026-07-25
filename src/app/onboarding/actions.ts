"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  logo_url: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url("URL inválida").optional().nullable()
  ),
});

export async function bootstrapInstitutionAction(input: unknown) {
  const supabase = await createClient(); // 👈 adicionado await
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = createInstitutionSchema.parse(input);

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
    await supabase.from("institutions").delete().eq("id", inst.id);
    throw new Error(memErr.message);
  }

  revalidatePath("/onboarding");
  return { institutionId: inst.id };
}
