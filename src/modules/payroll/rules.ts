import { z } from "zod";

export interface SalaryParts {
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
}

export const grossPay = (s: SalaryParts) => s.basic + s.hra + s.allowances;
export const netPay = (s: SalaryParts) => grossPay(s) - s.deductions;

const money = (label: string) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v), z.number(`${label} must be a number.`).int(`${label} must be a whole number of rupees.`).min(0, `${label} cannot be negative.`).max(100_000_000, `${label} is too large.`));

export const salarySchema = z
  .object({ basic: money("Basic"), hra: money("HRA"), allowances: money("Allowances"), deductions: money("Deductions") })
  .refine((s) => s.deductions <= grossPay(s), { path: ["deductions"], message: "Deductions cannot exceed basic + HRA + allowances." });
