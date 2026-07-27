export type Status = "ativo" | "trancado" | "formado" | "evadido" | "transferido";

export type Student = {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  status: Status;
  class_id: string;
};

export const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "trancado", label: "Trancado" },
  { value: "formado", label: "Formado" },
  { value: "evadido", label: "Evadido" },
  { value: "transferido", label: "Transferido" },
];

export type ColumnKey = "registration" | "name" | "turma" | "status";

export const EXPORT_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "registration", label: "Matrícula" },
  { key: "name", label: "Nome" },
  { key: "turma", label: "Turma" },
  { key: "status", label: "Status" },
];
