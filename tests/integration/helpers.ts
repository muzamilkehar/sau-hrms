import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { keyToDate } from "@/lib/dates";
import type { Actor } from "@/modules/types";

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`TRUNCATE notification, activity, employee_document, leave_request, attendance, salary, employee, session, account, verification, "user" RESTART IDENTITY CASCADE`);
}

let counter = 0;
export async function makeEmployee(opts: { role?: "HR_ADMIN" | "EMPLOYEE"; first?: string; last?: string; code?: string; joined?: string; email?: string } = {}) {
  counter += 1;
  const role = opts.role ?? "EMPLOYEE";
  const id = randomUUID();
  const first = opts.first ?? "Test";
  const last = opts.last ?? `User${counter}`;
  const email = opts.email ?? `u${counter}-${id.slice(0, 6)}@saus.edu.pk`;
  const code = opts.code ?? `${role === "HR_ADMIN" ? "ADM" : "EMP"}${String(counter).padStart(3, "0")}`;
  await prisma.user.create({ data: { id, name: `${first} ${last}`, email, emailVerified: true, role } });
  const emp = await prisma.employee.create({
    data: { userId: id, employeeCode: code, firstName: first, lastName: last, designation: "Staff", department: "Computer Science", joiningDate: keyToDate(opts.joined ?? "2024-01-01"), salary: { create: { basic: 50000, hra: 20000, allowances: 5000, deductions: 2500 } } },
  });
  const actor: Actor = { userId: id, email, name: `${first} ${last}`, role, employeeId: emp.id };
  return { actor, userId: id, employeeId: emp.id, email, code };
}
