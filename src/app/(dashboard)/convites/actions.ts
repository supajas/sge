"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function generateCode(len = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const createInviteSchema = z.object({
  institution_id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  role: z.enum(["admin", "coord_geral", "coord_polo"]).nullable(),
  expires_in_days: z.number().int().min(1).max(90).default(7),
  single_use: z.boolean().default(true),
  polo_ids: z.array(z.string().uuid()).optional(),
});

export async function createInviteAction(input: unknown) {
  // 🟢 Adicionado await aqui!
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = createInviteSchema.parse(input);

  const { data: mem, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", data.institution_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr || !mem || (mem.role !== "owner" && mem.role !== "admin")) {
    throw new Error("Sem permissão para criar convite");
  }

  const expires = new Date(Date.now() + data.expires_in_days * 86400_000).toISOString();
  
  // Generate a unique code
  let code = "";
  let existing = null;
  for (let i = 0; i < 5; i++) {
    code = generateCode();
    const { data: found } = await supabase.from("invites").select("id").eq("code", code).maybeSingle();
    if (!found) {
      existing = null;
      break;
    }
    existing = found;
  }
  if (existing) throw new Error("Falha ao gerar um código de convite único. Tente novamente.");

  const { data: inv, error } = await supabase
    .from("invites")
    .insert({
      code,
      institution_id: data.institution_id,
      email: data.email ?? null,
      role: data.role ?? null, // Use data.role directly, which can be null
      polo_ids: data.polo_ids ?? [],
      expires_at: expires,
      single_use: data.single_use,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !inv) throw new Error(error?.message ?? "Falha ao criar convite");

  revalidatePath("/convites");
  return inv;
}

const updateInviteSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  role: z.enum(["admin", "coord_geral", "coord_polo"]).nullable(),
  expires_in_days: z.number().int().min(1).max(90),
  polo_ids: z.array(z.string().uuid()).optional(),
});

export async function updateInviteAction(input: unknown) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const data = updateInviteSchema.parse(input);

  const { data: mem, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("institution_id", data.institution_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr || !mem || (mem.role !== "owner" && mem.role !== "admin")) {
    throw new Error("Sem permissão para editar este convite");
  }

  // Check if invite exists and belongs to the institution
  const { data: existingInvite, error: existingInviteError } = await supabase
    .from("invites")
    .select("id")
    .eq("id", data.id)
    .eq("institution_id", data.institution_id)
    .maybeSingle();

  if (existingInviteError || !existingInvite) {
    throw new Error("Convite não encontrado ou não pertence a esta instituição.");
  }

  const expires = new Date(Date.now() + data.expires_in_days * 86400_000).toISOString();

  const { error } = await supabase
    .from("invites")
    .update({
      email: data.email ?? null,
      role: data.role ?? null, // Use data.role directly, which can be null
      polo_ids: data.polo_ids ?? [],
      expires_at: expires,
    })
    .eq("id", data.id);

  if (error) throw new Error(error?.message ?? "Falha ao atualizar convite");

  revalidatePath("/convites");
  return { success: true };
}
