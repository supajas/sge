import type { AppRole } from "./roles";

/**
 * Fonte única de verdade para vínculos de Polo/Curso na criação e no
 * resgate de convites — e também deveria ser usada pelo EditMembershipDialog
 * (colaboradores) para nunca mais divergir do que o fluxo de convite permite.
 *
 * Dois conceitos diferentes, de propósito:
 *
 * - "Exige" (REQUIRES): o papel PRECISA de pelo menos um vínculo — bloqueia
 *   o envio do formulário se vazio. Ex: um Professor sem curso nenhum não
 *   faz sentido.
 *
 * - "Permite" (ALLOWS): o papel PODE opcionalmente ter um vínculo, mas não é
 *   obrigatório. Ex: um Coordenador de Polo normalmente só precisa do polo
 *   (o curso já é visível indiretamente via course_polos), mas pode receber
 *   um curso específico também, quando isso desbloqueia alguma tela/recurso.
 *
 * Um papel institucional (owner/admin/secretaria) nunca deveria ter polo ou
 * curso — nem como opção.
 */

export const INSTITUTIONAL_ROLES: AppRole[] = ["owner", "admin", "secretaria"];

export const ROLE_REQUIRES_POLO: AppRole[] = [
  "coord_polo",
  "tutor_presencial",
  "professor",
  "tutor_distancia",
];

export const ROLE_REQUIRES_COURSE: AppRole[] = [
  "coord_curso",
  "tutor_presencial",
  "professor",
  "tutor_distancia",
];

export function roleRequiresPolo(role: AppRole | string | null | undefined): boolean {
  return !!role && ROLE_REQUIRES_POLO.includes(role as AppRole);
}

export function roleRequiresCourse(role: AppRole | string | null | undefined): boolean {
  return !!role && ROLE_REQUIRES_COURSE.includes(role as AppRole);
}

/** Qualquer papel não institucional pode opcionalmente receber um polo. */
export function roleAllowsPolo(role: AppRole | string | null | undefined): boolean {
  return !!role && !INSTITUTIONAL_ROLES.includes(role as AppRole);
}

/** Qualquer papel não institucional pode opcionalmente receber um curso. */
export function roleAllowsCourse(role: AppRole | string | null | undefined): boolean {
  return !!role && !INSTITUTIONAL_ROLES.includes(role as AppRole);
}
