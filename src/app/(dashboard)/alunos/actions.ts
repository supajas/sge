"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Student, Status } from "@/lib/types/students";

// Helper to authorize admin-like users for a specific institution
async function authorizeAdmin(supabase: ReturnType<typeof createClient>, institutionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("institution_id", institutionId)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Você não tem permissão para executar esta ação.");
  }
  return { user, institutionId };
}

// Helper to authorize any logged-in member of an institution
async function authorizeMember(supabase: ReturnType<typeof createClient>, institutionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");
  
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("institution_id", institutionId)
      .single();
  
    if (!membership) throw new Error("Você não é membro desta instituição.");

    return { user, institutionId };
}


const studentSchema = z.object({
    id: z.string().uuid().optional(),
    registration: z.string().min(1, "Matrícula é obrigatória"),
    name: z.string().min(1, "Nome é obrigatório"),
    cpf: z.string().nullable(),
    email: z.string().email().nullable(),
    status: z.enum(["ativo", "trancado", "formado", "evadido", "transferido"]),
    class_id: z.string().uuid(),
});

export async function saveStudentAction(input: Omit<Student, "id"> & { id?: string }) {
    const supabase = await createClient();
    const data = studentSchema.parse(input);

    const { data: classData } = await supabase.from("classes").select("institution_id").eq("id", data.class_id).single();
    if (!classData) throw new Error("Turma não encontrada.");

    await authorizeAdmin(supabase, classData.institution_id);

    const { id, ...payload } = data;
    const studentData = { ...payload, institution_id: classData.institution_id };

    if (id) {
        const { error } = await supabase.from("students").update(studentData).eq("id", id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from("students").insert(studentData);
        if (error) throw new Error(error.message);
    }
    revalidatePath("/alunos");
}

export async function deleteStudentAction(studentId: string) {
    const supabase = await createClient();

    const { data: student } = await supabase.from("students").select("institution_id").eq("id", studentId).single();
    if (!student) throw new Error("Aluno não encontrado.");

    await authorizeAdmin(supabase, student.institution_id);

    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) throw new Error(error.message);

    revalidatePath("/alunos");
}

const importStudentSchema = z.array(
    z.object({
        registration: z.string().min(1),
        name: z.string().min(1),
        cpf: z.string().optional().nullable(),
        email: z.string().email().optional().nullable(),
        status: z.enum(["ativo", "trancado", "formado", "evadido", "transferido"]).default("ativo"),
        class_id: z.string().uuid(),
    })
);

export async function importStudentsAction(rows: Array<Omit<Student, "id">>) {
    const supabase = await createClient();
    const data = importStudentSchema.parse(rows);

    if (data.length === 0) return { count: 0 };

    const { data: classData } = await supabase.from("classes").select("institution_id").eq("id", data[0].class_id).single();
    if (!classData) throw new Error("Turma não encontrada.");

    await authorizeAdmin(supabase, classData.institution_id);

    const payload = data.map(r => ({ ...r, institution_id: classData.institution_id }));

    const { error } = await supabase.from("students").insert(payload);
    if (error) throw new Error(error.message);

    revalidatePath("/alunos");
    return { count: data.length };
}

export async function updateStudentStatusAction({ studentId, status }: { studentId: string, status: Status }) {
    const supabase = await createClient();

    const { data: student } = await supabase.from("students").select("institution_id").eq("id", studentId).single();
    if (!student) throw new Error("Aluno não encontrado.");

    // Any member of the institution can change the status
    await authorizeMember(supabase, student.institution_id);

    const { error } = await supabase.from("students").update({ status, updated_at: new Date().toISOString() }).eq("id", studentId);
    if (error) throw new Error(error.message);

    revalidatePath("/alunos");
}
