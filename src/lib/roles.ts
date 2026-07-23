export type AppRole = "owner" | "admin" | "coord_geral" | "coord_polo";

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Administrador",
  coord_geral: "Coordenador Geral",
  coord_polo: "Coordenador de Polo",
};

export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "coord_geral", label: "Coordenador Geral" },
  { value: "coord_polo", label: "Coordenador de Polo" },
];

export function isAdminLike(role: AppRole | null | undefined) {
  return role === "owner" || role === "admin";
}
