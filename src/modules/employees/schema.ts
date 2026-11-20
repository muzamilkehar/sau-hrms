import { z } from "zod";
import { emptyToUndefined } from "@/lib/action";
import { isDateKey } from "@/lib/dates";

const name = (label: string) => z.string().trim().min(1, `Enter the ${label}.`).max(60);
const phone = z.preprocess(emptyToUndefined, z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number.").optional());
const text = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const dateKey = z.string().refine(isDateKey, "Choose a valid date.");

export const contactSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  phone,
  address: text(200),
  emergencyContact: text(120),
});

export const employeeFields = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  designation: z.string().trim().min(2, "Enter the designation.").max(80),
  department: z.string().trim().min(2, "Enter the department.").max(80),
  joiningDate: dateKey,
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  phone,
  address: text(200),
  emergencyContact: text(120),
});

export const createEmployeeSchema = employeeFields.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  role: z.enum(["HR_ADMIN", "EMPLOYEE"]),
});

export type ContactInput = z.output<typeof contactSchema>;
export type EmployeeFieldsInput = z.output<typeof employeeFields>;
export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
