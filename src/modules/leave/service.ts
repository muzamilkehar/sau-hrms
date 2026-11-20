import { prisma } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { dateToKey, formatKeyDate, keyToDate, todayKey } from "@/lib/dates";
import { notify, notifyHr, recordActivity } from "@/modules/activity";
import { assertHr, requireEmployeeId, type Actor } from "@/modules/types";
import { LEAVE_LABEL, rangesOverlap, validateLeaveRange } from "./rules";

export interface ApplyInput {
  type: "PAID" | "UNPAID" | "SICK";
  startKey: string;
  endKey: string;
  reason: string;
}

export async function applyForLeave(actor: Actor, input: ApplyInput, now: Date = new Date()) {
  const employeeId = requireEmployeeId(actor);
  const reason = input.reason.trim();
  if (reason.length < 3) throw new ValidationError("Please give a short reason.", { reason: ["Enter a reason."] });
  if (reason.length > 500) throw new ValidationError("The reason is too long.", { reason: ["Maximum 500 characters."] });
  const days = validateLeaveRange(input.startKey, input.endKey, todayKey(now));
  const existing = await prisma.leaveRequest.findMany({ where: { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: keyToDate(input.endKey) }, endDate: { gte: keyToDate(input.startKey) } }, select: { startDate: true, endDate: true, status: true } });
  const clash = existing.find((e) => rangesOverlap({ startKey: input.startKey, endKey: input.endKey }, { startKey: dateToKey(e.startDate), endKey: dateToKey(e.endDate) }));
  if (clash) throw new ConflictError(`These dates overlap with a ${clash.status.toLowerCase()} request (${formatKeyDate(dateToKey(clash.startDate))} to ${formatKeyDate(dateToKey(clash.endDate))}).`);
  const leave = await prisma.leaveRequest.create({ data: { employeeId, type: input.type, startDate: keyToDate(input.startKey), endDate: keyToDate(input.endKey), days, reason } });
  const label = `${LEAVE_LABEL[input.type]?.toLowerCase()} (${input.startKey} to ${input.endKey})`;
  await recordActivity({ type: "LEAVE_REQUESTED", message: `${actor.name} requested ${label}`, actorId: actor.userId });
  await notifyHr(`${actor.name} requested ${label}.`, "/admin/leave");
  return leave;
}

export async function cancelLeave(actor: Actor, id: string) {
  const employeeId = requireEmployeeId(actor);
  const leave = await prisma.leaveRequest.findUnique({ where: { id }, select: { employeeId: true, status: true } });
  if (!leave || leave.employeeId !== employeeId) throw new NotFoundError("Leave request not found.");
  const result = await prisma.leaveRequest.updateMany({ where: { id, employeeId, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (result.count === 0) throw new ConflictError("Only pending requests can be cancelled.");
}

export async function decideLeave(actor: Actor, id: string, decision: "APPROVED" | "REJECTED", remarks?: string) {
  assertHr(actor);
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { id: true, startDate: true, endDate: true, type: true, status: true, employee: { select: { userId: true, firstName: true, lastName: true, employeeCode: true } } },
  });
  if (!leave) throw new NotFoundError("Leave request not found.");
  if (leave.employee.userId === actor.userId) throw new ForbiddenError("You cannot decide your own leave request.");
  const cleanRemarks = remarks?.trim() || null;
  if (cleanRemarks && cleanRemarks.length > 300) throw new ValidationError("Remarks are too long.", { remarks: ["Maximum 300 characters."] });
  const claimed = await prisma.leaveRequest.updateMany({ where: { id, status: "PENDING" }, data: { status: decision, remarks: cleanRemarks, decidedById: actor.userId, decidedAt: new Date() } });
  if (claimed.count === 0) throw new ConflictError("This request has already been decided or cancelled.");
  const range = `${dateToKey(leave.startDate)} \u2192 ${dateToKey(leave.endDate)}`;
  const verb = decision === "APPROVED" ? "approved" : "rejected";
  await notify(leave.employee.userId, `Your leave request (${range}) was ${verb}${cleanRemarks ? `: "${cleanRemarks}"` : ""}`, "/app/leave");
  await recordActivity({ type: `LEAVE_${decision}`, message: `${actor.name} ${verb} the leave of ${leave.employee.firstName} ${leave.employee.lastName} (${leave.employee.employeeCode})`, actorId: actor.userId, details: { range, remarks: cleanRemarks } });
}

export async function listOwnLeave(actor: Actor) {
  const employeeId = requireEmployeeId(actor);
  return prisma.leaveRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, take: 200 });
}

export interface LeaveListQuery {
  status: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  skip: number;
  take: number;
}

export async function listAllLeave(actor: Actor, query: LeaveListQuery) {
  assertHr(actor);
  const where = query.status === "ALL" ? {} : { status: query.status };
  const [rows, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where, orderBy: [{ createdAt: "desc" }], skip: query.skip, take: query.take,
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, department: true } } },
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  return { rows, total };
}
