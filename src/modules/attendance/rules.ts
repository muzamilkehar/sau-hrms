import { eachDay, isWeekend, type DateKey } from "@/lib/dates";

/** Working at least this many hours between check-in and check-out counts as a full day. */
export const FULL_DAY_HOURS = 6;

export type DerivedStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "LEAVE" | "NOT_YET";
export const STATUS_FILTERS = ["ALL", "PRESENT", "ABSENT", "HALF_DAY", "LEAVE"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export function hoursBetween(checkIn: Date, checkOut: Date): number {
  return Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 3_600_000);
}

export function statusAtCheckout(checkIn: Date, checkOut: Date): "PRESENT" | "HALF_DAY" {
  return hoursBetween(checkIn, checkOut) >= FULL_DAY_HOURS ? "PRESENT" : "HALF_DAY";
}

export interface RecordLike {
  checkIn: Date | null;
  checkOut: Date | null;
  status: "PRESENT" | "HALF_DAY";
}

export interface AttendanceRow {
  employeeId: string;
  key: DateKey;
  status: DerivedStatus;
  checkIn: Date | null;
  checkOut: Date | null;
  hours: number | null;
}

export interface DeriveInput {
  employees: Array<{ id: string; joinKey: DateKey }>;
  records: Map<string, RecordLike>; // key: `${employeeId}|${dateKey}`
  leaves: Array<{ employeeId: string; startKey: DateKey; endKey: DateKey }>; // approved only
  from: DateKey;
  to: DateKey;
  today: DateKey;
}

export const recordKey = (employeeId: string, key: DateKey) => `${employeeId}|${key}`;

/**
 * One row per employee per working day in range. Weekends, days before joining and future days produce no row.
 * Stored records win; otherwise an approved leave is LEAVE; today without a check-in is NOT_YET; past days are ABSENT.
 */
export function deriveAttendanceRows(input: DeriveInput): AttendanceRow[] {
  const last = input.to > input.today ? input.today : input.to;
  if (input.from > last) return [];
  const rows: AttendanceRow[] = [];
  for (const key of eachDay(input.from, last)) {
    for (const emp of input.employees) {
      if (key < emp.joinKey) continue;
      const rec = input.records.get(recordKey(emp.id, key));
      if (rec) {
        rows.push({ employeeId: emp.id, key, status: rec.status, checkIn: rec.checkIn, checkOut: rec.checkOut, hours: rec.checkIn && rec.checkOut ? hoursBetween(rec.checkIn, rec.checkOut) : null });
        continue;
      }
      if (isWeekend(key)) continue;
      const onLeave = input.leaves.some((l) => l.employeeId === emp.id && l.startKey <= key && key <= l.endKey);
      const status: DerivedStatus = onLeave ? "LEAVE" : key === input.today ? "NOT_YET" : "ABSENT";
      rows.push({ employeeId: emp.id, key, status, checkIn: null, checkOut: null, hours: null });
    }
  }
  return rows;
}

export const matchesStatus = (row: AttendanceRow, filter: StatusFilter) => filter === "ALL" || row.status === filter;
