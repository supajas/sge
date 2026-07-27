export type Field = {
  id: string;
  label: string;
  kind: "score" | "average" | "status";
  weight: number;
  max_value: number;
  order_index: number;
};

export type Template = { id: string; name: string; is_default: boolean; fields: Field[] };

export const KIND_LABEL: Record<Field["kind"], string> = {
  score: "Nota",
  average: "Média",
  status: "Situação",
};
