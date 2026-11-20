import { prisma } from "@/lib/db";
import { keyToDate, todayKey } from "@/lib/dates";
import { recentActivity } from "@/modules/activity";
import { assertHr, type Actor } from "@/modules/types";

export async function hrDashboard(actor: Actor, now: Date = new Date()) {
  assertHr(actor);
  const [employees, presentToday, pendingLeaves, activity] = await Promise.all([
    prisma.employee.count({ where: { user: { isActive: true } } }),
    prisma.attendance.count({ where: { date: keyToDate(todayKey(now)), employee: { user: { isActive: true } } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    recentActivity(10),
  ]);
  return { employees, presentToday, pendingLeaves, activity };
}
