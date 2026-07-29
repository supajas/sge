export type Course = {
  id: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
  workload_hours: number | null;
  course_id: string;
};

// Formato aceito em cada item do JSON importado
export type SubjectInput = {
  name: string;
  workload_hours?: number | null;
  course_id: string;
};

export interface Subject {
  id: string;
  name: string;
  course_id: string;
  workload_hours?: number | null;
  is_active: boolean; // Novo campo
}
