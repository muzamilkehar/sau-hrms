"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formToObject, parse, run, success } from "@/lib/action";
import { actionUser } from "@/lib/session";
import { createEmployeeSchema, employeeFields } from "@/modules/employees/schema";
import { createEmployee, resetEmployeePassword, setEmployeeActive, updateEmployeeByHr } from "@/modules/employees/service";

type State = import("@/lib/action").FormState;
const id = z.string().min(1);

export async function createEmployeeAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("HR_ADMIN");
    const created = await createEmployee(user, parse(createEmployeeSchema, formToObject(formData)));
    revalidatePath("/admin/employees");
    return success({ tempPassword: created.tempPassword, href: `/admin/employees/${created.id}`, hrefLabel: `Open ${created.employeeCode}` }, `Employee ${created.employeeCode} created.`);
  });
}

export async function updateEmployeeAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("HR_ADMIN");
    const empId = parse(id, formData.get("id"));
    await updateEmployeeByHr(user, empId, parse(employeeFields, formToObject(formData)));
    revalidatePath(`/admin/employees/${empId}`);
    revalidatePath("/admin/employees");
    return success(undefined, "Employee updated.");
  });
}

export async function setActiveAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("HR_ADMIN");
    const empId = parse(id, formData.get("id"));
    const active = formData.get("active") === "true";
    await setEmployeeActive(user, empId, active);
    revalidatePath(`/admin/employees/${empId}`);
    revalidatePath("/admin/employees");
    return success(undefined, active ? "Employee reactivated." : "Employee deactivated and signed out everywhere.");
  });
}

export async function resetPasswordAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("HR_ADMIN");
    const { tempPassword } = await resetEmployeePassword(user, parse(id, formData.get("id")));
    return success({ tempPassword }, "Password reset. The employee must choose a new one at next sign-in.");
  });
}
