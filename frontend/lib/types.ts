export interface User {
  id: number;
  account_id: string;
  name: string;
  faculty: string;
  academic_rank: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  className: string;
  date: Date;
  totalStudents: number;
  presentStudents: number;
  duration: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'pending';
  lastSeen?: Date;
  confidence?: number;
}

export interface Classroom {
  id: string;
  name: string;
  subject: string;
}

export interface User {
  id: number;
  account_id: string;
  name: string;
  faculty: string;
  academic_rank: string;
}

export type StudentRef = {
  id: number;
  name: string;
};
export type ClassOut = {
  id: number;
  user_id: number;
  name: string;
  subject: string;
  status: string;
};
export type ClassSummary = ClassOut & {
  roster_count: number;
  sessions_count: number;
};
export type SessionOut = {
  id: number;
  class_id: number;
  start_time: string;
  end_time: string;
};

export type SessionWithStats = SessionOut & {
  present_count: number;
  total_students: number;
};

export type AttendanceEntry = {
  student_id: number;
  name: string;
  in_time: string;
  out_time: string | null;
  avg_confidence?: number | null;
};
