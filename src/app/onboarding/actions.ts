"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createInstitutionSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(120),
  city: z.string().trim().min(2, "Cidade deve ter no mínimo 2 caracteres").max(80),
  state: z.string().trim().min(2, "Estado deve ter no mínimo 2 caracteres").max(40),
  logo_url: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url("URL do logo inválida").optional().nullable()
  ),
});

// Helper para obter cliente com privilégios de Admin (Service Role)
function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    return createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return null;
}

export async function bootstrapInstitutionAction(input: unknown) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Sessão expirada. Faça login novamente para continuar.");
    }

    const data = createInstitutionSchema.parse(input);
    const supabaseAdmin = getAdminClient();

    // 1. Criação da instituição
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

    if (instErr || !inst) {
      throw new Error(instErr?.message ?? "Falha ao criar instituição.");
    }

    // 2. Criação/Vínculo de Membership como 'owner'
    // Usa o cliente admin se disponível para garantir a gravação
    const clientForMembership = supabaseAdmin ?? supabase;
    const { error: memErr } = await clientForMembership
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

    // 3. Rollback de segurança caso a membership falhe
    if (memErr) {
      console.error("Erro ao criar membership no onboarding, executando rollback...", memErr);
      
      // Usa obrigatoriamente o admin client no rollback para contornar limitações de RLS
      const rollbackClient = supabaseAdmin ?? supabase;
      await rollbackClient.from("institutions").delete().eq("id", inst.id);

      throw new Error(memErr.message ?? "Falha ao vincular usuário como responsável pela instituição.");
    }

    revalidatePath("/onboarding");
    return { institutionId: inst.id };
  } catch (err: any) {
    console.error("Erro em bootstrapInstitutionAction:", err);
    throw new Error(err.message || "Erro ao processar criação da instituição.");
  }
}
