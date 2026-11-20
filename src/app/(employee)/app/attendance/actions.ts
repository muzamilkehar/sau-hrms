"use server";

import { revalidatePath } from "next/cache";
import { fail, run, success } from "@/lib/action";
import { actionUser } from "@/lib/session";
import { checkIn, checkOut } from "@/modules/attendance/service";

type State = import("@/lib/action").FormState;

export async function clockAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    const op = formData.get("op");
    if (op === "in") await checkIn(user);
    else if (op === "out") await checkOut(user);
    else return fail("Unknown action.");
    revalidatePath("/app/attendance");
    return success(undefined, op === "in" ? "Checked in." : "Checked out.");
  });
}
