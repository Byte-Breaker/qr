import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  const names = name.trim().split(/\s+/);
  if (names.length === 1 && names[0].length > 0) {
    return names[0].substring(0, Math.min(2, names[0].length)).toUpperCase();
  }
  if (names.length > 1 && names[0].length > 0 && names[names.length - 1].length > 0) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  if (names.length > 0 && names[0].length > 0) {
    return names[0].substring(0, Math.min(2, names[0].length)).toUpperCase();
  }
  return '?';
}
