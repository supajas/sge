import { supabase } from "@/lib/supabase/client";

export async function bootstrapInstitution(data: {
  name: string;
  city: string;
  state: string;
  logo_url?: string | null;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Não autenticado");
  }

  const userId = userData.user.id;

  // 1. Cria a instituição
  // O trigger 'trg_institution_auto_owner' no Postgres vai vincular o criador 
  // na tabela 'memberships' como 'owner' e o 'trg_institution_seed_grade_template'
  // vai gerar as notas padrão de forma automática no banco!
  const { data: inst, error: instErr } = await supabase
    .from("institutions")
    .insert({
      name: data.name,
      city: data.city,
      state: data.state,
      logo_url: data.logo_url ?? null,
      owner_id: userId,
    })
    .select("id")
    .single();

  if (instErr || !inst) {
    throw new Error(instErr?.message ?? "Falha ao criar instituição");
  }

  return { institutionId: inst.id };
}
