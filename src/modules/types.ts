import { ForbiddenError } from "@/lib/errors";

export type RoleKey = "HR_ADMIN" | "EMPLOYEE";

/** Who is performing an action. Built from the session by lib/session.ts, or by tests. */
export interface Actor {
  userId: string;
  email: string;
  name: string;
  role: RoleKey;
  employeeId: string | null;
}

export function assertHr(actor: Actor): void {
  if (actor.role !== "HR_ADMIN") throw new ForbiddenError("Only HR can do this.");
}

export function requireEmployeeId(actor: Actor): string {
  if (!actor.employeeId) throw new ForbiddenError("This action is only available to employees.");
  return actor.employeeId;
}
