"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { fail, parse, run } from "@/lib/action";
import { prisma } from "@/lib/db";
import { isPasswordBreached, newPasswordSchema } from "@/lib/password";
import { consume } from "@/lib/ratelimit";
import { homeFor, requireUser } from "@/lib/session";

type State = import("@/lib/action").FormState;

export async function changePasswordAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await requireUser({ allowPasswordChange: true });
    if (!(await consume(`pwchange:${user.userId}`, { window: 600, max: 8 })).allowed) return fail("Too many attempts. Please wait a few minutes.");
    const input = parse(
      z
        .object({ currentPassword: z.string().min(1, "Enter your current password."), newPassword: newPasswordSchema({ email: user.email, name: user.name }), confirm: z.string() })
        .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords do not match." })
        .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a different password from the current one." }),
      { currentPassword: formData.get("currentPassword"), newPassword: formData.get("newPassword"), confirm: formData.get("confirm") },
    );
    if (await isPasswordBreached(input.newPassword)) return fail("That password appears in known data breaches. Choose a different one.", { newPassword: ["Choose a different password."] });
    try {
      await getAuth().api.changePassword({ body: { currentPassword: input.currentPassword, newPassword: input.newPassword, revokeOtherSessions: true }, headers: await headers() });
    } catch {
      return fail("Your current password is not correct.", { currentPassword: ["Not correct."] });
    }
    await prisma.user.update({ where: { id: user.userId }, data: { mustChangePassword: false } });
    redirect(homeFor(user.role));
  });
}
