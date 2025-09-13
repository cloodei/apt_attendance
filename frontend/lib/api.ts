import { revalidateTag } from "next/cache";
import { User } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8080";

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
export type SessionOut = {
  id: number;
  class_id: number;
  start_time: string;
  end_time: string;
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function apiSearchStudents(query: string) {
  const res = await fetch(`${API_BASE}/api/students/search?query=${encodeURIComponent(query)}`, {
    credentials: "include",
    cache: "force-cache",
    next: {
      revalidate: 120
    }
  });

  return handle<StudentRef[]>(res);
}

export async function apiCreateClass(input: { account_id: string; name: string; subject: string; status?: string; student_ids: number[] }) {
  const res = await fetch(`${API_BASE}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, status: input.status ?? "active" }),
    credentials: "include",
  });

  revalidateTag(`cls-${input.account_id}`);
  return handle<ClassOut>(res);
}

export async function apiListClasses(account_id: string) {
  const res = await fetch(`${API_BASE}/api/classes?account_id=${encodeURIComponent(account_id)}`, {
    credentials: "include",
    cache: "force-cache",
    next: {
      revalidate: 120,
      tags: [`cls-${account_id}`]
    }
  });

  return handle<ClassOut[]>(res);
}

export async function apiGetClass(class_id: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}`, {
    credentials: "include",
    cache: "force-cache",
    next: {
      revalidate: 120,
      tags: [`cls-${class_id}`]
    }
  });

  return handle<ClassOut>(res);
}

export async function apiGetClassRoster(class_id: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}/students`, {
    credentials: "include",
    cache: "force-cache",
    next: {
      revalidate: 120,
      tags: [`clr-${class_id}`]
    }
  });

  return handle<StudentRef[]>(res);
}

export async function apiStartSession(class_id: number, hour: number, minute: number) {
  const res = await fetch(`${API_BASE}/api/classes/${class_id}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hour, minute }),
    credentials: "include",
  });

  return handle<SessionOut>(res);
}

export async function apiGetUserByAccount(account_id: string) {
  const res = await fetch(`${API_BASE}/api/users/by-account/${encodeURIComponent(account_id)}`, {
    credentials: "include",
    cache: "force-cache",
    next: {
      revalidate: 120,
      tags: [`usr-${account_id}`]
    }
  });

  return handle<User>(res);
}
