export interface User {
  id: number;
  account_id: string;
  name: string;
  faculty: string;
  academic_rank: string;
}

export interface AttendanceSession {
  id: string;
  classId: string; // reference to Classroom.id
  className: string;
  date: Date;
  totalStudents: number;
  presentStudents: number;
  duration: number;
}

export interface Student {
  id: string;
  name: string;
  email: string; // should be student_id
  status: 'present' | 'absent' | 'pending';
  lastSeen?: Date; //should be in_time + out_time, if in_time and out_time are null then Student is Absent
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
