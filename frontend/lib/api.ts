"use server";

import { User, SessionWithStats, AttendanceEntry } from "./types";
import { revalidateTag } from "next/cache";
import { API_BASE } from "./utils";
import { StudentRef, ClassOut, ClassSummary, SessionOut } from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }

  return await res.json();
}

export async function apiSearchStudents(query: string) {
  const res = await fetch(`${API_BASE}/api/students/search?query=${query}`, {
    credentials: "include",
  });

  return await handle<StudentRef[]>(res);
}

export async function apiCreateClass(input: { account_id: string; user_id: number; name: string; subject: string; status?: string; student_ids: number[] }) {
  const res = await fetch(`${API_BASE}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, status: input.status ?? "active" }),
    credentials: "include",
  });

  return await handle<ClassOut>(res);
}

export async function apiListClasses(user_id: number) {
  const res = await fetch(`${API_BASE}/api/classes?user_id=${user_id}`, {
    credentials: "include",
  });

  return await handle<ClassOut[]>(res);
}

export async function apiListClassesWithCounts(account_id: string) {
  const res = await fetch(`${API_BASE}/api/classes/with-counts?account_id=${account_id.toUpperCase()}`, {
    credentials: "include",
  });

  return await handle<ClassSummary[]>(res);
}

export async function apiGetClass(class_id: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}`, {
    credentials: "include",
  });

  return await handle<ClassOut>(res);
}

export async function apiGetClassRoster(class_id: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}/students`, {
    credentials: "include",
  });

  return await handle<StudentRef[]>(res);
}

export async function apiStartSession(class_id: number, hour: number, minute: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hour, minute }),
    credentials: "include",
  });

  return await handle<SessionOut>(res);
}

export async function apiGetUserByAccount(account_id: string) {
  const res = await fetch(`${API_BASE}/api/users/${account_id.toUpperCase()}`, {
    credentials: "include",
  });

  return await handle<User>(res);
}

export async function apiListSessionsForClass(class_id: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}/sessions`, {
    credentials: "include",
  });

  return await handle<SessionOut[]>(res);
}

export async function apiListSessionsWithStats(class_id: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}/sessions/with-stats`, {
    credentials: "include",
  });

  return await handle<SessionWithStats[]>(res);
}

export async function apiListSessionAttendance(session_id: number) {
  const res = await fetch(`${API_BASE}/api/sessions/${session_id}/attendance`, {
    credentials: "include",
  });

  return await handle<AttendanceEntry[]>(res);
}
