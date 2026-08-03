export interface Course {
  id: string;
  name: string;
}

export interface Period {
  id: string;
  name: string;
  is_active: boolean;
}

export interface SubjectInput {
  id?: string;
  name: string;
  workload_hours?: number | null;
  course_id: string;
  period_id?: string;
}

export interface ExtendedSubject {
  id: string;
  name: string;
  workload_hours?: number | null;
  course_id: string;
  period_id?: string | null;
  is_active: boolean;
}

export interface DisciplinasContextSelectorProps {
  cursoId: string | null;
  periodoId: string |null;
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