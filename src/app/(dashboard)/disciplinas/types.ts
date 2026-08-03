import { Course, Subject } from "@/lib/types/subjects";

export type Period = {
  id: string;
  name: string;
  is_active: boolean;
};

export type ExtendedSubject = Subject & {
  period_id?: string | null;
  is_active?: boolean;
};

export interface DisciplinasContextSelectorProps {
  cursoId: string | null;
  periodoId: string | null;
  courses: Course[];
  periods: Period[];
  coursesLoading: boolean;
  periodsLoading: boolean;
  isFiltered: boolean;
  onParamChange: (key: string, value: string | null) => void;
}

export interface DisciplinasListProps {
  cursoId: string;
  periodoId: string;
  canEdit: boolean;
  courses: Course[];
  periods?: Period[];
}