import { Student, Status } from "@/lib/types/students";

export type { Student, Status };

export interface SelectOption {
  id: string;
  name?: string;
  label?: string;
}

export interface AlunosFilterState {
  cursoId: string | null;
  poloId: string | null;
  turmaId: string | null;
}