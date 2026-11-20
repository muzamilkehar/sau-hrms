import { prisma } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { addDays, dateToKey, isWeekend, keyToDate, todayKey, type DateKey } from "@/lib/dates";
import { recordActivity } from "@/modules/activity";
import { assertHr, requireEmployeeId, type Actor } from "@/modules/types";
import { deriveAttendanceRows, matchesStatus, recordKey, statusAtCheckout, type AttendanceRow, type RecordLike, type StatusFilter } from "./rules";

const uniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

export async function checkIn(actor: Actor, now: Date = new Date()) {
  const employeeId = requireEmployeeId(actor);
  const key = todayKey(now);
  if (isWeekend(key)) throw new ConflictError("Today is a weekly off. You do not need to check in.");
  const onLeave = await prisma.leaveRequest.findFirst({ where: { employeeId, status: "APPROVED", startDate: { lte: keyToDate(key) }, endDate: { gte: keyToDate(key) } }, select: { id: true } });
  if (onLeave) throw new ConflictError("You are on approved leave today.");
  try {
    await prisma.attendance.create({ data: { employeeId, date: keyToDate(key), checkIn: now, status: "PRESENT" } });
  } catch (e) {
    if (uniqueViolation(e)) throw new ConflictError("You have already checked in today");
    throw e;
  }
  await recordActivity({ type: "CHECK_IN", message: `${actor.name} checked in`, actorId: actor.userId });
}

export async function checkOut(actor: Actor, now: Date = new Date()) {
  const employeeId = requireEmployeeId(actor);
  const rec = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: keyToDate(todayKey(now)) } } });
  if (!rec || !rec.checkIn) throw new ConflictError("You have not checked in today");
  if (rec.checkOut) throw new ConflictError("You have already checked out today");
  const claimed = await prisma.attendance.updateMany({ where: { id: rec.id, checkOut: null }, data: { checkOut: now, status: statusAtCheckout(rec.checkIn, now) } });
  if (claimed.count === 0) throw new ConflictError("You have already checked out today");
}

export async function getTodayRecord(actor: Actor, now: Date = new Date()) {
  const employeeId = requireEmployeeId(actor);
  return prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: keyToDate(todayKey(now)) } } });
}

async function loadRange(employeeIds: string[], from: DateKey, to: DateKey) {
  const [records, leaves] = await Promise.all([
    prisma.attendance.findMany({ where: { employeeId: { in: employeeIds }, date: { gte: keyToDate(from), lte: keyToDate(to) } } }),
    prisma.leaveRequest.findMany({ where: { employeeId: { in: employeeIds }, status: "APPROVED", startDate: { lte: keyToDate(to) }, endDate: { gte: keyToDate(from) } }, select: { employeeId: true, startDate: true, endDate: true } }),
  ]);
  const map = new Map<string, RecordLike>();
  for (const r of records) map.set(recordKey(r.employeeId, dateToKey(r.date)), { checkIn: r.checkIn, checkOut: r.checkOut, status: r.status });
  return { records: map, leaves: leaves.map((l) => ({ employeeId: l.employeeId, startKey: dateToKey(l.startDate), endKey: dateToKey(l.endDate) })) };
}

/** The employee's own history for the last `days` days, newest first. */
export async function listOwnAttendance(actor: Actor, days = 30, now: Date = new Date()): Promise<AttendanceRow[]> {
  const employeeId = requireEmployeeId(actor);
  const today = todayKey(now);
  const emp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { joiningDate: true } });
  const from = addDays(today, -(days - 1));
  const { records, leaves } = await loadRange([employeeId], from, today);
  return deriveAttendanceRows({ employees: [{ id: employeeId, joinKey: dateToKey(emp.joiningDate) }], records, leaves, from, to: today, today }).reverse();
}

export interface AttendanceQuery {
  from: DateKey;
  to: DateKey;
  status: StatusFilter;
  q?: string;
  skip: number;
  take: number;
}

export async function listAllAttendance(actor: Actor, query: AttendanceQuery, now: Date = new Date()) {
  assertHr(actor);
  const q = query.q?.trim();
  const employees = await prisma.employee.findMany({
    where: { user: { isActive: true }, ...(q ? { OR: [{ employeeCode: { contains: q, mode: "insensitive" as const } }, { firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }, { user: { email: { contains: q, mode: "insensitive" as const } } }] } : {}) },
    select: { id: true, employeeCode: true, firstName: true, lastName: true, joiningDate: true },
    orderBy: { employeeCode: "asc" },
  });
  const ids = employees.map((e) => e.id);
  const { records, leaves } = await loadRange(ids, query.from, query.to);
  const rows = deriveAttendanceRows({ employees: employees.map((e) => ({ id: e.id, joinKey: dateToKey(e.joiningDate) })), records, leaves, from: query.from, to: query.to, today: todayKey(now) })
    .filter((r) => matchesStatus(r, query.status))
    .sort((a, b) => (a.key === b.key ? 0 : a.key < b.key ? 1 : -1));
  const byId = new Map(employees.map((e) => [e.id, e]));
  const page = rows.slice(query.skip, query.skip + query.take).map((r) => ({ ...r, employee: byId.get(r.employeeId)! }));
  return { rows: page, total: rows.length };
}
