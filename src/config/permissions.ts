// src/config/permissions.ts
import { AppRole } from '@/lib/roles';

export type Permission =
  // --- VISUALIZAÇÕES (Navegação & Leitura) ---
  | 'view:dashboard'
  | 'view:polos'
  | 'view:courses'
  | 'view:classes'
  | 'view:disciplines'
  | 'view:hidden_disciplines'
  | 'view:students'
  | 'view:grades'            
  | 'view:invites'           
  | 'view:collaborators'     
  | 'view:configurations'    
  | 'view:templates-notas'
  | 'view:periods'

  // --- GERENCIAMENTO (Ações de Criação, Edição e Exclusão) ---
  | 'manage:courses'
  | 'manage:students'
  | 'manage:grades'
  | 'manage:invites'
  | 'manage:collaborators'
  | 'manage:configurations'
  | 'manage:templates-notas'
  | 'manage:periods';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    'view:dashboard', 'view:polos', 'view:courses', 'view:classes', 'view:disciplines', 'view:hidden_disciplines',
    'view:students', 'view:grades', 'view:invites', 'view:collaborators', 'view:configurations', 'view:templates-notas', 'view:periods',
    'manage:courses', 'manage:students', 'manage:grades', 'manage:invites', 'manage:collaborators', 'manage:configurations', 'manage:templates-notas', 'manage:periods'
  ],
  admin: [
    'view:dashboard', 'view:polos', 'view:courses', 'view:classes', 'view:disciplines', 'view:hidden_disciplines',
    'view:students', 'view:grades', 'view:invites', 'view:collaborators', 'view:configurations', 'view:templates-notas', 'view:periods',
    'manage:courses', 'manage:students', 'manage:grades', 'manage:invites', 'manage:collaborators', 'manage:configurations', 'manage:templates-notas', 'manage:periods'
  ],
  coord_geral: [
    'view:dashboard', 'view:polos', 'view:courses', 'view:classes', 'view:disciplines', 'view:hidden_disciplines',
    'view:students', 'view:grades', 'view:invites', 'view:collaborators', 'view:configurations', 'view:templates-notas', 'view:periods',
    'manage:courses', 'manage:students', 'manage:grades', 'manage:invites', 'manage:collaborators', 'manage:configurations', 'manage:templates-notas', 'manage:periods'
  ],
  secretaria: [
    'view:dashboard', 'view:polos', 'view:courses', 'view:classes', 'view:disciplines', 'view:hidden_disciplines',
    'view:students', 'view:grades', 'view:invites', 'view:collaborators', 'view:periods',
    'manage:students', 'manage:invites'
  ],
  coord_curso: [
    'view:dashboard', 'view:courses', 'view:classes', 'view:polos', 'view:disciplines', 'view:hidden_disciplines',
    'view:students', 'view:grades', 'view:templates-notas', 'view:periods', 'manage:courses', 'manage:grades'
  ],
  
  // ⛔ PERFIS RESTRITOS (Escopo regional / de sala)
  coord_polo: [
    'view:dashboard', 'view:courses', 'view:classes', 'view:polos', 'view:disciplines',
    'view:students', 'view:grades', 'view:templates-notas', 'view:periods',
    'manage:grades'
  ],
  professor: [
    'view:dashboard', 'view:courses', 'view:classes', 'view:polos', 'view:disciplines', 'view:students', 'view:periods',
    'manage:grades'
  ],
  tutor_presencial: [
    'view:dashboard', 'view:courses', 'view:polos', 'view:classes', 'view:disciplines', 'view:students', 'view:grades', 'view:periods',
    'manage:grades'
  ],
  tutor_distancia: [
    'view:dashboard', 'view:courses', 'view:polos', 'view:classes', 'view:disciplines', 'view:students', 'view:grades', 'view:periods',
    'manage:grades'
  ]
};

/**
 * Função genérica para validar qualquer permissão
 */
export function hasPermission(role: AppRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role as AppRole]?.includes(permission) ?? false;
}

/**
 * Helper de domínio: Checa se o papel atual pode visualizar disciplinas inativas/ocultas
 */
export function canViewHiddenSubjects(role: AppRole | string | undefined | null): boolean {
  return hasPermission(role, 'view:hidden_disciplines');
}