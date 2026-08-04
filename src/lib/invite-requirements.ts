import type { AppRole } from "./roles";

/**
 * Fonte única de verdade: quais papéis exigem vínculo obrigatório a Polo
 * e/ou Curso na criação e no resgate de um convite.
 *
 * Importado tanto pelo front (convites/page.tsx, para decidir quais
 * seletores mostrar no modal) quanto pelo back (convites/actions.ts e
 * invite/[code]/actions.ts, para validar antes de gravar no banco).
 * Nunca duplique essa lógica em outro lugar — só importe daqui.
 */
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
