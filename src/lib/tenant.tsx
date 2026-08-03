"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "./roles";

const STORAGE_KEY = "active_institution_id";

export type TenantMembership = {
  membershipId: string;
  institutionId: string;
  institutionName: string;
  city: string;
  state: string;
  logoUrl: string | null;
  role: AppRole;
};

export type ActiveTenant = TenantMembership & {
  /** Cursos vinculados ao membro via membership_courses. */
  scopedCourseIds: string[];
  /** Polos vinculados ao membro via membership_polos. */
  scopedPoloIds: string[];
  /** Indica se o perfil possui restrição por polo. */
  isPoloScoped: boolean;
};

type TenantContextValue = {
  memberships: TenantMembership[];
  active: ActiveTenant | null;
  setActive: (institutionId: string) => void;
  loading: boolean;
  isDataLoaded: boolean;
  refetch: () => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["memberships", userId],
    queryFn: async (): Promise<{
      memberships: TenantMembership[];
      poloIdsByMembership: Record<string, string[]>;
      courseIdsByMembership: Record<string, string[]>;
    }> => {
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          id, 
          role, 
          institution_id, 
          institutions!inner(name, city, state, logo_url), 
          membership_polos(polo_id),
          membership_courses(course_id)
        `)
        .eq("user_id", userId);

      if (error) throw error;

      const memberships: TenantMembership[] = [];
      const poloIdsByMembership: Record<string, string[]> = {};
      const courseIdsByMembership: Record<string, string[]> = {};

      for (const m of data ?? []) {
        const inst = m.institutions as unknown as {
          name: string;
          city: string;
          state: string;
          logo_url: string | null;
        };

        memberships.push({
          membershipId: m.id,
          institutionId: m.institution_id,
          institutionName: inst.name,
          city: inst.city,
          state: inst.state,
          logoUrl: inst.logo_url,
          role: m.role as AppRole,
        });

        // Mapeia Polos
        const poloIds = (m.membership_polos ?? []).map(
          (mp: { polo_id: string }) => mp.polo_id
        );
        poloIdsByMembership[m.id] = poloIds;

        // Mapeia Cursos
        const courseIds = (m.membership_courses ?? []).map(
          (mc: { course_id: string }) => mc.course_id
        );
        courseIdsByMembership[m.id] = courseIds;
      }

      return { memberships, poloIdsByMembership, courseIdsByMembership };
    },
    enabled: !!userId,
  });

  const memberships = data?.memberships ?? [];

  const base =
    memberships.find((m) => m.institutionId === activeId) ??
    memberships[0] ??
    null;

  useEffect(() => {
    if (base && base.institutionId !== activeId) {
      setActiveId(base.institutionId);
      localStorage.setItem(STORAGE_KEY, base.institutionId);
    }
  }, [base, activeId]);

  const active: ActiveTenant | null = base
    ? {
        ...base,
        scopedPoloIds: data?.poloIdsByMembership[base.membershipId] ?? [],
        scopedCourseIds: data?.courseIdsByMembership[base.membershipId] ?? [],
        isPoloScoped: ["coord_polo", "tutor_presencial"].includes(base.role),
      }
    : null;

  const isDataLoaded = !isLoading && !isFetching && data !== undefined;

  return (
    <TenantContext.Provider
      value={{
        memberships,
        active,
        setActive: (id) => {
          setActiveId(id);
          localStorage.setItem(STORAGE_KEY, id);
        },
        loading: isLoading || isFetching,
        isDataLoaded,
        refetch,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant deve ser usado dentro de TenantProvider");
  return ctx;
}

export function useActiveTenant() {
  const { active } = useTenant();
  if (!active) throw new Error("Sem instituição ativa");
  return active;
}