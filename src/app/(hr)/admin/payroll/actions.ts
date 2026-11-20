"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parse, run, success } from "@/lib/action";
import { actionUser } from "@/lib/session";
import { updateSalary } from "@/modules/payroll/service";

type State = import("@/lib/action").FormState;

export async function updateSalaryAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("HR_ADMIN");
    const employeeId = parse(z.string().min(1), formData.get("employeeId"));
    await updateSalary(user, employeeId, { basic: formData.get("basic"), hra: formData.get("hra"), allowances: formData.get("allowances"), deductions: formData.get("deductions") });
    revalidatePath("/admin/payroll");
    return success(undefined, "Payroll saved.");
  });
}
