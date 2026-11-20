import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, SESSION_ABSOLUTE_MS } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Actor, RoleKey } from "@/modules/types";

export interface CurrentUser extends Actor {
  mustChangePassword: boolean;
  employeeCode: string | null;
  sessionCreatedAt: Date;
}

export const homeFor = (role: RoleKey) => (role === "HR_ADMIN" ? "/admin" : "/app");

/** Resolved once per request: session cookie, then the user and employee record from the database. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, employee: { select: { id: true, employeeCode: true } } },
  });
  if (!user || !user.isActive) return null;
  return {
    userId: user.id, name: user.name, email: user.email, role: user.role, employeeId: user.employee?.id ?? null, employeeCode: user.employee?.employeeCode ?? null,
    mustChangePassword: user.mustChangePassword, sessionCreatedAt: new Date(session.session.createdAt),
  };
});

export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (Date.now() - user.sessionCreatedAt.getTime() > SESSION_ABSOLUTE_MS) redirect("/session-expired");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password");
  return user;
}

/** Pages and actions of one portal. Someone with the other role is sent to their own portal. */
export async function requireRole(role: RoleKey): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}

/** For server actions: authenticated, and (optionally) of the required role. */
export async function actionUser(role?: RoleKey): Promise<CurrentUser> {
  const user = await requireUser();
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}
