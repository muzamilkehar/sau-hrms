import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Asia/Karachi";

/** True when the date is in the future. Kept here so server components stay free of direct Date.now() calls. */
export function isFuture(value: Date | null | undefined): boolean {
  return !!value && value.getTime() > Date.now();
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ,
  }).format(new Date(value));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function greeting(date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(date));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function titleCase(value: string): string {
  return value.toLowerCase().split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
