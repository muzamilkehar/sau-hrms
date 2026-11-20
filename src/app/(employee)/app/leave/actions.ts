"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parse, run, success } from "@/lib/action";
import { actionUser } from "@/lib/session";
import { LEAVE_TYPES } from "@/modules/leave/rules";
import { applyForLeave, cancelLeave } from "@/modules/leave/service";

type State = import("@/lib/action").FormState;

export async function applyLeaveAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    const input = parse(
      z.object({ type: z.enum(LEAVE_TYPES, "Choose a leave type."), startDate: z.string().min(1, "Choose the first day."), endDate: z.string().min(1, "Choose the last day."), reason: z.string().trim().min(3, "Enter a short reason.").max(500) }),
      { type: formData.get("type"), startDate: formData.get("startDate"), endDate: formData.get("endDate"), reason: formData.get("reason") },
    );
    await applyForLeave(user, { type: input.type, startKey: input.startDate, endKey: input.endDate, reason: input.reason });
    revalidatePath("/app/leave");
    return success(undefined, "Leave request submitted. HR will review it.");
  });
}

export async function cancelLeaveAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    await cancelLeave(user, parse(z.string().min(1), formData.get("id")));
    revalidatePath("/app/leave");
    return success(undefined, "Request cancelled.");
  });
}
