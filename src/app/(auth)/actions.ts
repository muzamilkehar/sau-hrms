"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { fail, parse, run, success } from "@/lib/action";
import { consume } from "@/lib/ratelimit";
import { infoFromHeaders } from "@/lib/request";
import { isPasswordBreached, newPasswordSchema } from "@/lib/password";

type State = import("@/lib/action").FormState;

/** Always answers the same way, so the form cannot be used to discover which emails have accounts. */
export async function requestPasswordResetAction(_prev: State, formData: FormData) {
  return run(async () => {
    const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") }), { email: formData.get("email") });
    const h = await headers();
    const limit = await consume(`pwreset:${infoFromHeaders(h).ip ?? "unknown"}`, { window: 600, max: 5 });
    if (!limit.allowed) return fail("Too many requests. Please wait a few minutes and try again.");
    try {
      await getAuth().api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" }, headers: h });
    } catch (e) {
      console.error("[auth] password reset request failed", e);
    }
    return success(undefined, "If an account exists for that email, a reset link has been sent. It is valid for one hour.");
  });
}

export async function resetPasswordAction(_prev: State, formData: FormData) {
  return run(async () => {
    const input = parse(
      z.object({ token: z.string().min(10, "This reset link is invalid."), newPassword: newPasswordSchema(), confirm: z.string() }).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords do not match." }),
      { token: formData.get("token"), newPassword: formData.get("newPassword"), confirm: formData.get("confirm") },
    );
    if (await isPasswordBreached(input.newPassword)) return fail("That password appears in known data breaches. Choose a different one.", { newPassword: ["Choose a different password."] });
    try {
      await getAuth().api.resetPassword({ body: { token: input.token, newPassword: input.newPassword } });
    } catch {
      return fail("This reset link is invalid or has expired. Request a new one.");
    }
    return success(undefined, "Your password was changed. You can now sign in.");
  });
}
