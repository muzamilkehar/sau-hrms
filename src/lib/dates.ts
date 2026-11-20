/**
 * Calendar dates are handled as "date keys" (YYYY-MM-DD) in Pakistan time, so a check-in at 00:30 PKT
 * belongs to the right day on any server (Vercel runs in UTC). Database DATE columns round-trip through
 * UTC-midnight Date objects (keyToDate / dateToKey).
 */
export const TZ = "Asia/Karachi";
export type DateKey = string;

const KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !KEY.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** The Pakistan calendar day an instant falls on. */
export function dateKeyOf(instant: Date): DateKey {
  return keyFormat.format(instant);
}
export const todayKey = (now: Date = new Date()): DateKey => dateKeyOf(now);

export const keyToDate = (key: DateKey): Date => new Date(`${key}T00:00:00.000Z`);
export const dateToKey = (date: Date): DateKey => date.toISOString().slice(0, 10);

export function addDays(key: DateKey, n: number): DateKey {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToKey(d);
}

export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function diffDays(from: DateKey, to: DateKey): number {
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday */
export const dayOfWeek = (key: DateKey): number => keyToDate(key).getUTCDay();

/** Weekly off days: Saturday and Sunday. Change here if the university works a different week. */
export const WEEKLY_OFF = [0, 6];
export const isWeekend = (key: DateKey): boolean => WEEKLY_OFF.includes(dayOfWeek(key));

export function countWorkingDays(from: DateKey, to: DateKey): number {
  if (from > to) return 0;
  return eachDay(from, to).filter((k) => !isWeekend(k)).length;
}

export const monthKey = (key: DateKey): string => key.slice(0, 7);
export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
export const formatDayLabel = (key: DateKey): string => dayFmt.format(keyToDate(key));
export const formatKeyDate = (key: DateKey): string => dateFmt.format(keyToDate(key));
