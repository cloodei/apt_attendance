import { AttendanceSession, Student, Classroom } from "./types";

export interface AttendanceRecordDetails {
  session: AttendanceSession;
  students: Student[];
}

// --- Sample data: Classrooms ---
export const classes: Classroom[] = [
  { id: "c1", name: "Computer Science 101", subject: "CS101" },
  { id: "c2", name: "Data Structures", subject: "CS201" },
  { id: "c3", name: "Algorithms", subject: "CS301" },
];

// --- Sample data: Student directory (for selection when creating classes) ---
export const studentsDirectory: Array<{ id: string; name: string; email: string }> = [
  { id: "s1", name: "Alice Johnson", email: "alice@example.com" },
  { id: "s2", name: "Bob Smith", email: "bob@example.com" },
  { id: "s3", name: "Carol Lee", email: "carol@example.com" },
  { id: "s4", name: "David Kim", email: "david@example.com" },
  { id: "s5", name: "Eva Green", email: "eva@example.com" },
  { id: "s6", name: "Frank Moore", email: "frank@example.com" },
  { id: "s7", name: "Grace Chen", email: "grace@example.com" },
  { id: "s8", name: "Henry Zhao", email: "henry@example.com" },
  { id: "s9", name: "Irene Patel", email: "irene@example.com" },
  { id: "s10", name: "Jake Wilson", email: "jake@example.com" },
  { id: "s11", name: "Luna Park", email: "luna@example.com" },
];

export const attendanceSessions: AttendanceSession[] = [
  {
    id: "1",
    classId: "c1",
    className: "Computer Science 101",
    date: new Date("2024-01-15T09:00:00"),
    totalStudents: 25,
    presentStudents: 22,
    duration: 45,
  },
  {
    id: "2",
    classId: "c2",
    className: "Data Structures",
    date: new Date("2024-01-14T11:00:00"),
    totalStudents: 30,
    presentStudents: 28,
    duration: 50,
  },
  {
    id: "3",
    classId: "c3",
    className: "Algorithms",
    date: new Date("2024-01-13T14:00:00"),
    totalStudents: 28,
    presentStudents: 25,
    duration: 40,
  },
];

const studentsByRecord: Record<string, Student[]> = {
  "1": [
    { id: "s1", name: "Alice Johnson", email: "alice@example.com", status: "present", lastSeen: new Date("2024-01-15T09:10:00"), confidence: 0.96 },
    { id: "s2", name: "Bob Smith", email: "bob@example.com", status: "present", lastSeen: new Date("2024-01-15T09:12:00"), confidence: 0.91 },
    { id: "s3", name: "Carol Lee", email: "carol@example.com", status: "absent" },
    { id: "s4", name: "David Kim", email: "david@example.com", status: "present", lastSeen: new Date("2024-01-15T09:18:00"), confidence: 0.88 },
    { id: "s5", name: "Eva Green", email: "eva@example.com", status: "present", lastSeen: new Date("2024-01-15T09:07:00"), confidence: 0.93 },
    { id: "s6", name: "Frank Moore", email: "frank@example.com", status: "pending" },
    { id: "s7", name: "Grace Chen", email: "grace@example.com", status: "present", lastSeen: new Date("2024-01-15T09:21:00"), confidence: 0.89 },
  ],
  "2": [
    { id: "s1", name: "Alice Johnson", email: "alice@example.com", status: "present", lastSeen: new Date("2024-01-14T11:05:00"), confidence: 0.97 },
    { id: "s3", name: "Carol Lee", email: "carol@example.com", status: "present", lastSeen: new Date("2024-01-14T11:09:00"), confidence: 0.9 },
    { id: "s8", name: "Henry Zhao", email: "henry@example.com", status: "present", lastSeen: new Date("2024-01-14T11:11:00"), confidence: 0.86 },
    { id: "s9", name: "Irene Patel", email: "irene@example.com", status: "present", lastSeen: new Date("2024-01-14T11:15:00"), confidence: 0.92 },
    { id: "s10", name: "Jake Wilson", email: "jake@example.com", status: "absent" },
  ],
  "3": [
    { id: "s2", name: "Bob Smith", email: "bob@example.com", status: "present", lastSeen: new Date("2024-01-13T14:07:00"), confidence: 0.94 },
    { id: "s4", name: "David Kim", email: "david@example.com", status: "present", lastSeen: new Date("2024-01-13T14:10:00"), confidence: 0.9 },
    { id: "s6", name: "Frank Moore", email: "frank@example.com", status: "absent" },
    { id: "s11", name: "Luna Park", email: "luna@example.com", status: "present", lastSeen: new Date("2024-01-13T14:14:00"), confidence: 0.87 },
  ],
};

// Map class rosters by classId (for demo purposes)
const classStudents: Record<string, string[]> = {
  c1: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
  c2: ["s1", "s3", "s8", "s9", "s10"],
  c3: ["s2", "s4", "s6", "s11"],
};

export function listAttendanceSessions() {
  return attendanceSessions;
}

export function getAttendanceRecord(id: string) {
  const session = attendanceSessions.find((s) => s.id === id);
  if (!session) return undefined;
  const students = studentsByRecord[id] ?? [];
  return { session, students };
}

// --- New helpers for classes ---
export function listClasses() {
  return classes;
}

export function getClassById(id: string) {
  return classes.find((c) => c.id === id);
}

export function listSessionsForClass(classId: string) {
  return attendanceSessions.filter((s) => s.classId === classId);
}

export function listAllStudents() {
  return studentsDirectory;
}

export function getClassRoster(classId: string) {
  const ids = classStudents[classId] ?? [];
  return ids
    .map((id) => studentsDirectory.find((s) => s.id === id))
    .filter(Boolean) as Array<{ id: string; name: string; email: string }>;
}

export function createClass(input: { name: string; subject: string; studentIds: string[] }) {
  const id = `c${classes.length + 1}`;
  const classroom: Classroom = { id, name: input.name, subject: input.subject };
  classes.push(classroom);
  classStudents[id] = input.studentIds ?? [];
  return classroom;
}
