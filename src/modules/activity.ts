import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function recordActivity(input: { type: string; message: string; actorId?: string | null; details?: Prisma.InputJsonValue }) {
  await prisma.activity.create({ data: { type: input.type, message: input.message, actorId: input.actorId ?? null, details: input.details } });
}

export const recentActivity = (limit = 10) => prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: limit });

export async function notify(userId: string, message: string, link?: string) {
  await prisma.notification.create({ data: { userId, message, link: link ?? null } });
}

export async function notifyHr(message: string, link?: string) {
  const hr = await prisma.user.findMany({ where: { role: "HR_ADMIN", isActive: true }, select: { id: true } });
  if (hr.length) await prisma.notification.createMany({ data: hr.map((u) => ({ userId: u.id, message, link: link ?? null })) });
}
