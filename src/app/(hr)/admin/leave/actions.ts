"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parse, run, success } from "@/lib/action";
import { actionUser } from "@/lib/session";
import { decideLeave } from "@/modules/leave/service";

type State = import("@/lib/action").FormState;

export async function decideLeaveAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("HR_ADMIN");
    const input = parse(z.object({ id: z.string().min(1), decision: z.enum(["APPROVED", "REJECTED"]), remarks: z.string().trim().max(300).optional() }), { id: formData.get("id"), decision: formData.get("decision"), remarks: formData.get("remarks") || undefined });
    await decideLeave(user, input.id, input.decision, input.remarks);
    revalidatePath("/admin/leave");
    revalidatePath("/admin");
    return success(undefined, input.decision === "APPROVED" ? "Leave approved." : "Leave rejected.");
  });
}
