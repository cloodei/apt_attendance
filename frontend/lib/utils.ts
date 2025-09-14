import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8080";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
