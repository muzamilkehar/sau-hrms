"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { actionUser } from "@/lib/session";

export async function markAllReadAction() {
  const user = await actionUser("EMPLOYEE");
  await prisma.notification.updateMany({ where: { userId: user.userId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/app");
}
