import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { keyToDate } from "@/lib/dates";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { notify, recordActivity } from "@/modules/activity";
import { assertHr, requireEmployeeId, type Actor } from "@/modules/types";
import type { ContactInput, CreateEmployeeInput, EmployeeFieldsInput } from "./schema";

const uniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

export function nextCodeFrom(existing: string[], prefix: string): string {
  let max = 0;
  for (const code of existing) {
    const n = Number(code.slice(prefix.length));
    if (code.startsWith(prefix) && Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function nextEmployeeCode(role: "HR_ADMIN" | "EMPLOYEE"): Promise<string> {
  const prefix = role === "HR_ADMIN" ? "ADM" : "EMP";
  const rows = await prisma.employee.findMany({ where: { employeeCode: { startsWith: prefix } }, select: { employeeCode: true } });
  return nextCodeFrom(rows.map((r) => r.employeeCode), prefix);
}

export interface DirectoryQuery {
  q?: string;
  skip: number;
  take: number;
}

export async function listEmployees(actor: Actor, query: DirectoryQuery) {
  assertHr(actor);
  const q = query.q?.trim();
  const where = q
    ? { OR: [{ employeeCode: { contains: q, mode: "insensitive" as const } }, { user: { email: { contains: q, mode: "insensitive" as const } } }, { firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where, orderBy: [{ employeeCode: "asc" }], skip: query.skip, take: query.take,
      select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true, designation: true, joiningDate: true, employmentType: true, user: { select: { email: true, role: true, isActive: true } } },
    }),
    prisma.employee.count({ where }),
  ]);
  return { rows, total };
}

export async function getEmployeeForHr(actor: Actor, id: string) {
  assertHr(actor);
  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, userId: true, employeeCode: true, firstName: true, lastName: true, phone: true, address: true, emergencyContact: true, designation: true, department: true, joiningDate: true, employmentType: true, user: { select: { email: true, role: true, isActive: true, mustChangePassword: true, lastLoginAt: true, lockedUntil: true } } },
  });
  if (!emp) throw new NotFoundError("Employee not found.");
  return emp;
}

export async function getOwnProfile(actor: Actor) {
  const id = requireEmployeeId(actor);
  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, employeeCode: true, firstName: true, lastName: true, phone: true, address: true, emergencyContact: true, designation: true, department: true, joiningDate: true, employmentType: true, avatarType: true, user: { select: { email: true } }, salary: true },
  });
  if (!emp) throw new NotFoundError("Profile not found.");
  return emp;
}

export async function createEmployee(actor: Actor, input: CreateEmployeeInput) {
  assertHr(actor);
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw new ConflictError("A user with this email address already exists.");
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const userId = randomUUID();
  for (let attempt = 0; attempt < 3; attempt++) {
    const employeeCode = await nextEmployeeCode(input.role);
    try {
      const employee = await prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { id: userId, name: `${input.firstName} ${input.lastName}`, email: input.email, emailVerified: true, role: input.role, mustChangePassword: true } });
        await tx.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash } });
        return tx.employee.create({
          data: {
            userId, employeeCode, firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null, address: input.address ?? null, emergencyContact: input.emergencyContact ?? null,
            designation: input.designation, department: input.department, joiningDate: keyToDate(input.joiningDate), employmentType: input.employmentType,
            salary: { create: {} },
          },
        });
      });
      await recordActivity({ type: "EMPLOYEE_ADDED", message: `${actor.name} added ${input.firstName} ${input.lastName} (${employeeCode})`, actorId: actor.userId });
      return { id: employee.id, employeeCode, tempPassword };
    } catch (e) {
      if (uniqueViolation(e) && attempt < 2) continue; // employee code taken by a simultaneous request: take the next one
      if (uniqueViolation(e)) throw new ConflictError("Could not allocate an employee ID. Please try again.");
      throw e;
    }
  }
  throw new ConflictError("Could not create the employee. Please try again.");
}

export async function updateEmployeeByHr(actor: Actor, id: string, input: EmployeeFieldsInput) {
  assertHr(actor);
  const emp = await prisma.employee.findUnique({ where: { id }, select: { id: true, userId: true, employeeCode: true } });
  if (!emp) throw new NotFoundError("Employee not found.");
  await prisma.$transaction([
    prisma.employee.update({ where: { id }, data: { firstName: input.firstName, lastName: input.lastName, designation: input.designation, department: input.department, joiningDate: keyToDate(input.joiningDate), employmentType: input.employmentType, phone: input.phone ?? null, address: input.address ?? null, emergencyContact: input.emergencyContact ?? null } }),
    prisma.user.update({ where: { id: emp.userId }, data: { name: `${input.firstName} ${input.lastName}` } }),
  ]);
  await recordActivity({ type: "EMPLOYEE_UPDATED", message: `${actor.name} updated the record of ${input.firstName} ${input.lastName} (${emp.employeeCode})`, actorId: actor.userId });
}

export async function updateOwnContact(actor: Actor, input: ContactInput) {
  const id = requireEmployeeId(actor);
  await prisma.$transaction([
    prisma.employee.update({ where: { id }, data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null, address: input.address ?? null, emergencyContact: input.emergencyContact ?? null } }),
    prisma.user.update({ where: { id: actor.userId }, data: { name: `${input.firstName} ${input.lastName}` } }),
  ]);
}

async function otherActiveAdmins(excludeUserId: string) {
  return prisma.user.count({ where: { id: { not: excludeUserId }, isActive: true, role: "HR_ADMIN" } });
}

export async function setEmployeeActive(actor: Actor, id: string, active: boolean) {
  assertHr(actor);
  const emp = await prisma.employee.findUnique({ where: { id }, select: { userId: true, employeeCode: true, firstName: true, lastName: true, user: { select: { role: true } } } });
  if (!emp) throw new NotFoundError("Employee not found.");
  if (!active && emp.userId === actor.userId) throw new ConflictError("You cannot deactivate your own account.");
  if (!active && emp.user.role === "HR_ADMIN" && (await otherActiveAdmins(emp.userId)) === 0) throw new ConflictError("At least one active HR/Admin must remain.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: emp.userId }, data: { isActive: active, ...(active ? {} : { lockedUntil: null }) } });
    if (!active) await tx.session.deleteMany({ where: { userId: emp.userId } }); // signed out immediately
  });
  await recordActivity({ type: active ? "EMPLOYEE_ACTIVATED" : "EMPLOYEE_DEACTIVATED", message: `${actor.name} ${active ? "reactivated" : "deactivated"} ${emp.firstName} ${emp.lastName} (${emp.employeeCode})`, actorId: actor.userId });
}

export async function resetEmployeePassword(actor: Actor, id: string) {
  assertHr(actor);
  const emp = await prisma.employee.findUnique({ where: { id }, select: { userId: true, employeeCode: true } });
  if (!emp) throw new NotFoundError("Employee not found.");
  if (emp.userId === actor.userId) throw new ConflictError("Use Change password for your own password.");
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.account.updateMany({ where: { userId: emp.userId, providerId: "credential" }, data: { password: passwordHash } });
    if (updated.count === 0) await tx.account.create({ data: { id: randomUUID(), accountId: emp.userId, providerId: "credential", userId: emp.userId, password: passwordHash } });
    await tx.user.update({ where: { id: emp.userId }, data: { mustChangePassword: true, failedLoginCount: 0, lockedUntil: null } });
    await tx.session.deleteMany({ where: { userId: emp.userId } });
  });
  await recordActivity({ type: "PASSWORD_RESET", message: `${actor.name} reset the password of ${emp.employeeCode}`, actorId: actor.userId });
  await notify(emp.userId, "Your password was reset by HR. Sign in with the temporary password and choose a new one.");
  return { tempPassword };
}
