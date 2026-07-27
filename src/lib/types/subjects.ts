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
