"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { ActiveTenant } from "@/lib/tenant";
import { hasPermission, canViewHiddenSubjects } from "@/config/permissions";

export function useNotasFilters(filters: {
  tenantActive: ActiveTenant | null;
  courseId?: string | null;
  poloId?: string | null;
  classId?: string | null;
  periodId?: string | null;
}) {
  const { tenantActive, courseId, poloId, classId, periodId } = filters;
  const currentRole = tenantActive?.role;

  // Checagens baseadas no permissions.ts
  const canViewPolos = hasPermission(currentRole, "view:polos");
  const canViewClasses = hasPermission(currentRole, "view:classes");
  const canViewDisciplines = hasPermission(currentRole, "view:disciplines");
  const canViewGrades = hasPermission(currentRole, "view:grades");
  const showHidden = canViewHiddenSubjects(currentRole);

  // ---------------------------------------------------------------------------
  // 1. CURSOS
  // ---------------------------------------------------------------------------
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: [
      "notas-courses",
      tenantActive?.institutionId,
      currentRole,
      tenantActive?.scopedCourseIds,
    ],
    queryFn: async () => {
      if (!tenantActive) return [];

      const isInstitutionalRole = ["owner", "admin", "coord_geral", "secretaria"].includes(
        currentRole ?? ""
      );

      // Se for perfil restrito por curso (ex: coord_curso) e NÃO tiver cursos no scopedCourseIds, retorna vazio
      if (!isInstitutionalRole && tenantActive.scopedCourseIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", tenantActive.institutionId)
        .order("name");

      // Se não for perfil institucional amplo, filtra pelos cursos associados no tenant
      if (!isInstitutionalRole) {
        query = query.in("id", tenantActive.scopedCourseIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled:
      !!tenantActive?.institutionId && (canViewDisciplines || canViewGrades),
  });

  // ---------------------------------------------------------------------------
  // 2. POLOS
  // ---------------------------------------------------------------------------
  const { data: polos = [], isLoading: polosLoading } = useQuery({
    queryKey: [
      "notas-polos",
      tenantActive?.institutionId,
      currentRole,
      tenantActive?.scopedPoloIds,
    ],
    queryFn: async () => {
      if (!tenantActive || !canViewPolos) return [];

      const isInstitutionalRole = ["owner", "admin", "coord_geral", "secretaria"].includes(
        currentRole ?? ""
      );

      if (!isInstitutionalRole && tenantActive.scopedPoloIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("polos")
        .select("id, name")
        .eq("institution_id", tenantActive.institutionId)
        .order("name");

      if (!isInstitutionalRole) {
        query = query.in("id", tenantActive.scopedPoloIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantActive?.institutionId && canViewPolos,
  });

  // ---------------------------------------------------------------------------
  // 3. TURMAS (CLASSES)
  // ---------------------------------------------------------------------------
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: [
      "notas-classes",
      tenantActive?.institutionId,
      courseId,
      poloId,
      currentRole,
      tenantActive?.scopedPoloIds,
    ],
    queryFn: async () => {
      if (!tenantActive || !canViewClasses) return [];

      let query = supabase
        .from("classes")
        .select("id, name, polo_id, polos(name)")
        .eq("institution_id", tenantActive.institutionId)
        .order("name");

      if (courseId) query = query.eq("course_id", courseId);
      if (poloId) query = query.eq("polo_id", poloId);

      // Restrição por polo para perfis regionais
      if (["coord_polo", "tutor_presencial"].includes(currentRole ?? "")) {
        if (tenantActive.scopedPoloIds.length === 0) return [];
        query = query.in("polo_id", tenantActive.scopedPoloIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        hint: c.polos?.name ? `Polo: ${c.polos.name}` : undefined,
      }));
    },
    enabled: !!tenantActive?.institutionId && canViewClasses,
  });

  // ---------------------------------------------------------------------------
  // 4. PERÍODOS LETIVOS
  // ---------------------------------------------------------------------------
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ["notas-periods", tenantActive?.institutionId],
    queryFn: async () => {
      if (!tenantActive) return [];

      const { data, error } = await supabase
        .from("periods")
        .select("id, name, is_active")
        .eq("institution_id", tenantActive.institutionId)
        .order("name", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantActive?.institutionId && hasPermission(currentRole, "view:periods"),
  });

  // ---------------------------------------------------------------------------
  // 5. DISCIPLINAS (SUBJECTS)
  // ---------------------------------------------------------------------------
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: [
      "notas-subjects",
      tenantActive?.institutionId,
      courseId,
      periodId,
      showHidden,
    ],
    queryFn: async () => {
      if (!tenantActive || !courseId || !periodId || !canViewDisciplines) return [];

      let query = supabase
        .from("subjects")
        .select("id, name, workload_hours, is_active")
        .eq("institution_id", tenantActive.institutionId)
        .eq("course_id", courseId)
        .eq("period_id", periodId);

      if (!showHidden) {
        query = query.eq("is_active", true);
      }

      query = query.order("name");

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        hint: s.workload_hours ? `${s.workload_hours}h` : undefined,
      }));
    },
    enabled:
      !!tenantActive?.institutionId &&
      !!courseId &&
      !!periodId &&
      canViewDisciplines,
  });

  return {
    courses,
    coursesLoading,
    polos,
    polosLoading,
    classes,
    classesLoading,
    periods,
    periodsLoading,
    subjects,
    subjectsLoading,
  };
}