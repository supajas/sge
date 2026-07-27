"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminLike } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const reorderSchema = z.object({
  template_id: z.string().uuid(),
  field_id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export async function reorderTemplateFieldsAction(input: unknown) {
  const data = reorderSchema.parse(input);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  // Get template and authorize
  const { data: tpl } = await supabase
    .from("grade_templates")
    .select("id, institution_id")
    .eq("id", data.template_id)
    .single();
  if (!tpl) throw new Error("Template não encontrado.");

  const { data: caller } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("institution_id", tpl.institution_id)
    .single();

  if (!caller || !isAdminLike(caller.role)) {
    throw new Error("Você não tem permissão para reordenar campos.");
  }

  // Get all fields for the template
  const { data: fields, error: fErr } = await supabase
    .from("grade_template_fields")
    .select("id, order_index")
    .eq("template_id", data.template_id)
    .order("order_index");

  if (fErr) throw new Error("Não foi possível carregar os campos.");

  const fromIndex = fields.findIndex((f) => f.id === data.field_id);
  if (fromIndex === -1) throw new Error("Campo a ser movido não encontrado.");

  const toIndex = data.direction === "up" ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= fields.length) {
    throw new Error("Movimento inválido.");
  }

  const fieldA = fields[fromIndex];
  const fieldB = fields[toIndex];

  // Swap order_index values in a transaction
  const { error: rpcErr } = await supabase.rpc("swap_order_indexes", {
    table_name: "grade_template_fields",
    row_id_a: fieldA.id,
    row_id_b: fieldB.id,
    order_column: "order_index",
  });

  if (rpcErr) {
    // Fallback in case RPC function doesn't exist
    await supabase.from("grade_template_fields").update({ order_index: fieldB.order_index }).eq("id", fieldA.id);
    await supabase.from("grade_template_fields").update({ order_index: fieldA.order_index }).eq("id", fieldB.id);
  }

  revalidatePath("/templates-notas");
  return { ok: true };
}
