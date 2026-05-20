import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Gmail-style timestamp for inbox one-liners:
//   today      → "3:42 PM"
//   this year  → "May 19"
//   older      → "5/19/24"
export function formatSmartDate(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (isNaN(date.getTime())) return ""
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }
  return date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" })
}
