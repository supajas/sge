export type AppRole =
  | "owner"
  | "admin"
  | "coord_geral"
  | "coord_polo"
  | "coord_curso"
  | "secretaria"
  | "professor"
  | "tutor_presencial"
  | "tutor_distancia";

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Administrador",
  coord_geral: "Coordenador Geral",
  coord_polo: "Coordenador de Polo",
  coord_curso: "Coordenador de Curso",
  secretaria: "Secretaria",
  professor: "Professor",
  tutor_presencial: "Tutor Presencial",
  tutor_distancia: "Tutor a Distância",
};

export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "coord_geral", label: "Coordenador Geral" },
  { value: "secretaria", label: "Secretaria" },
  { value: "coord_polo", label: "Coordenador de Polo" },
  { value: "coord_curso", label: "Coordenador de Curso" },
  { value: "professor", label: "Professor" },
  { value: "tutor_presencial", label: "Tutor Presencial" },
  { value: "tutor_distancia", label: "Tutor a Distância" },
];

export function isAdminLike(role: AppRole | null | undefined) {
  return role === "owner" || role === "admin";
}
