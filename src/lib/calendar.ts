import { addDays, daysInMonth, eachDay, type DateKey } from "@/lib/dates";

export type CalendarStatus = "APPROVED" | "PENDING" | "REJECTED";
const PRIORITY: Record<CalendarStatus, number> = { APPROVED: 3, PENDING: 2, REJECTED: 1 };

export interface CalendarRequest {
  startKey: DateKey;
  endKey: DateKey;
  status: string;
}

/** Colour per day of a month: approved (green) wins over pending (yellow), which wins over rejected (red). */
export function buildCalendarMarks(requests: CalendarRequest[], year: number, month1: number): Map<DateKey, CalendarStatus> {
  const first = `${year}-${String(month1).padStart(2, "0")}-01`;
  const last = `${year}-${String(month1).padStart(2, "0")}-${String(daysInMonth(year, month1)).padStart(2, "0")}`;
  const marks = new Map<DateKey, CalendarStatus>();
  for (const r of requests) {
    if (r.status !== "APPROVED" && r.status !== "PENDING" && r.status !== "REJECTED") continue; // cancelled requests are not shown
    const status = r.status as CalendarStatus;
    if (r.endKey < first || r.startKey > last) continue;
    const from = r.startKey < first ? first : r.startKey;
    const to = r.endKey > last ? last : r.endKey;
    for (const k of eachDay(from, to)) {
      const current = marks.get(k);
      if (!current || PRIORITY[status] > PRIORITY[current]) marks.set(k, status);
    }
  }
  return marks;
}

/** Leading blanks and day keys for a Monday-first month grid. */
export function monthGrid(year: number, month1: number): { blanks: number; days: DateKey[] } {
  const first = `${year}-${String(month1).padStart(2, "0")}-01`;
  const weekday = new Date(`${first}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  const days = Array.from({ length: daysInMonth(year, month1) }, (_, i) => addDays(first, i));
  return { blanks: (weekday + 6) % 7, days };
}
