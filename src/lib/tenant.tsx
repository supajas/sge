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
  /** Polos aos quais o usuário está vinculado. Para owner/admin/coord_geral fica vazio (irrestrito). */
  scopedPoloIds: string[];
  /** true quando o papel do usuário é restrito por polos (coord_polo). */
  isPoloScoped: boolean;
};

type TenantContextValue = {
  memberships: TenantMembership[];
  active: ActiveTenant | null;
  setActive: (institutionId: string) => void;
  loading: boolean;
  refetch: () => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["memberships", userId],
    queryFn: async (): Promise<{ memberships: TenantMembership[]; poloIdsByMembership: Record<string, string[]> }> => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, institution_id, institutions!inner(name, city, state, logo_url), coordinator_polos(polo_id)")
        .eq("user_id", userId);
      if (error) throw error;
      const memberships: TenantMembership[] = [];
      const poloIdsByMembership: Record<string, string[]> = {};
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
        poloIdsByMembership[m.id] = (m.coordinator_polos ?? []).map(
          (c: { polo_id: string }) => c.polo_id,
        );
      }
      return { memberships, poloIdsByMembership };
    },
  });

  const memberships = data?.memberships ?? [];
  const base =
    memberships.find((m) => m.institutionId === activeId) ??
    (memberships.length === 1 ? memberships[0] : null);

  const active: ActiveTenant | null = base
    ? {
        ...base,
        scopedPoloIds: data?.poloIdsByMembership[base.membershipId] ?? [],
        isPoloScoped: base.role === "coord_polo",
      }
    : null;

  useEffect(() => {
    if (active) localStorage.setItem(STORAGE_KEY, active.institutionId);
  }, [active]);

  return (
    <TenantContext.Provider
      value={{
        memberships,
        active,
        setActive: (id) => {
          setActiveId(id);
          localStorage.setItem(STORAGE_KEY, id);
        },
        loading: isLoading,
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
