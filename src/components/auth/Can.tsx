"use client";

import { ReactNode } from "react";
import { Permission, hasPermission } from "@/config/permissions";
import { useTenant } from "@/lib/tenant";

interface CanProps {
  /** A permissão necessária para renderizar o conteúdo (ex: 'manage:courses', 'manage:students') */
  I: Permission;
  /** O elemento ou trecho de JSX que será exibido se o usuário tiver a permissão */
  children: ReactNode;
  /** Conteúdo alternativo opcional caso o usuário NÃO tenha permissão (padrão é null) */
  fallback?: ReactNode;
}

/**
 * Componente declarativo para controle de visibilidade baseado em permissões (RBAC).
 *
 * @example
 * <Can I="manage:courses">
 *   <Button onClick={handleCreate}>+ Criar Curso</Button>
 * </Can>
 */
export function Can({ I, children, fallback = null }: CanProps) {
  const { active } = useTenant();
  const currentRole = active?.role;

  if (!hasPermission(currentRole, I)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
