import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { recordActivity } from "@/modules/activity";
import { assertHr, requireEmployeeId, type Actor } from "@/modules/types";
import { netPay, salarySchema } from "./rules";

export interface PayrollQuery {
  q?: string;
  skip: number;
  take: number;
}

export async function listPayroll(actor: Actor, query: PayrollQuery) {
  assertHr(actor);
  const q = query.q?.trim();
  const where = q
    ? { OR: [{ employeeCode: { contains: q, mode: "insensitive" as const } }, { user: { email: { contains: q, mode: "insensitive" as const } } }, { firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({ where, orderBy: { employeeCode: "asc" }, skip: query.skip, take: query.take, select: { id: true, employeeCode: true, firstName: true, lastName: true, user: { select: { email: true } }, salary: true } }),
    prisma.employee.count({ where }),
  ]);
  return { rows, total };
}

export async function updateSalary(actor: Actor, employeeId: string, raw: unknown) {
  assertHr(actor);
  const parsed = salarySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[String(issue.path[0] ?? "_")] ??= []).push(issue.message);
    throw new ValidationError("Please correct the highlighted fields.", fieldErrors);
  }
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, employeeCode: true, firstName: true, lastName: true, salary: true } });
  if (!emp) throw new NotFoundError("Employee not found.");
  const before = emp.salary ? { basic: emp.salary.basic, hra: emp.salary.hra, allowances: emp.salary.allowances, deductions: emp.salary.deductions } : { basic: 0, hra: 0, allowances: 0, deductions: 0 };
  const after = parsed.data;
  await prisma.salary.upsert({ where: { employeeId }, create: { employeeId, ...after, updatedById: actor.userId }, update: { ...after, updatedById: actor.userId } });
  await recordActivity({
    type: "PAYROLL_UPDATED",
    message: `${actor.name} updated the payroll of ${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
    actorId: actor.userId,
    details: { before: { ...before, net: netPay(before) }, after: { ...after, net: netPay(after) } },
  });
}

/** An employee can only ever read their own salary. */
export async function getOwnSalary(actor: Actor) {
  const employeeId = requireEmployeeId(actor);
  const salary = await prisma.salary.findUnique({ where: { employeeId } });
  return salary ?? { basic: 0, hra: 0, allowances: 0, deductions: 0 };
}
