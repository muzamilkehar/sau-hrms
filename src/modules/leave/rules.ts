import { ValidationError } from "@/lib/errors";
import { addDays, countWorkingDays, diffDays, isDateKey, type DateKey } from "@/lib/dates";

export const MAX_SPAN_DAYS = 30;
export const BACKDATE_DAYS = 7;
export const LEAVE_TYPES = ["PAID", "UNPAID", "SICK"] as const;
export const LEAVE_LABEL: Record<string, string> = { PAID: "Paid leave", UNPAID: "Unpaid leave", SICK: "Sick leave" };

export function rangesOverlap(a: { startKey: DateKey; endKey: DateKey }, b: { startKey: DateKey; endKey: DateKey }): boolean {
  return a.startKey <= b.endKey && b.startKey <= a.endKey;
}

/** Validates a requested range and returns the number of working days it covers. */
export function validateLeaveRange(startKey: unknown, endKey: unknown, today: DateKey): number {
  if (!isDateKey(startKey)) throw new ValidationError("Choose a valid start date.", { startDate: ["Choose a valid date."] });
  if (!isDateKey(endKey)) throw new ValidationError("Choose a valid end date.", { endDate: ["Choose a valid date."] });
  if (endKey < startKey) throw new ValidationError("The end date cannot be before the start date.", { endDate: ["Must be on or after the start date."] });
  if (startKey < addDays(today, -BACKDATE_DAYS)) throw new ValidationError(`Leave can be requested at most ${BACKDATE_DAYS} days after the fact.`, { startDate: ["Too far in the past."] });
  if (diffDays(startKey, endKey) + 1 > MAX_SPAN_DAYS) throw new ValidationError(`A single request can cover at most ${MAX_SPAN_DAYS} days.`, { endDate: ["Range is too long."] });
  const days = countWorkingDays(startKey, endKey);
  if (days < 1) throw new ValidationError("The selected dates fall only on weekly off days.", { startDate: ["Choose at least one working day."] });
  return days;
}
