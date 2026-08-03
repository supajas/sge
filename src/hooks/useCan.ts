// src/hooks/useCan.ts
"use client";

import { Permission, hasPermission } from "@/config/permissions";
import { useTenant } from "@/lib/tenant";

/**
 * Hook para checar permissões do usuário logado programaticamente.
 *
 * @example
 * const canManage = useCan('manage:students');
 */
export function useCan(permission: Permission): boolean {
  const { active } = useTenant();
  return hasPermission(active?.role, permission);
}
