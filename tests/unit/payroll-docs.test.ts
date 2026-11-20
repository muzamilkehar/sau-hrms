import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { grossPay, netPay, salarySchema } from "@/modules/payroll/rules";
import { MAX_DOCUMENT_BYTES, safeFileName, sniffType, validateUpload } from "@/modules/documents/rules";
import { nextCodeFrom } from "@/modules/employees/service";
import { createEmployeeSchema, contactSchema } from "@/modules/employees/schema";
import { parse } from "@/lib/action";
import { pageCount, parsePage } from "@/lib/pagination";

describe("payroll", () => {
  const s = { basic: 60000, hra: 24000, allowances: 10000, deductions: 6000 };
  it("computes gross and net pay", () => {
    expect(grossPay(s)).toBe(94000);
    expect(netPay(s)).toBe(88000);
  });
  it("accepts numbers typed into a form and rejects bad values", () => {
    expect(salarySchema.parse({ basic: "45000", hra: "18000", allowances: "7000", deductions: "4500" })).toEqual({ basic: 45000, hra: 18000, allowances: 7000, deductions: 4500 });
    expect(salarySchema.safeParse({ ...s, basic: "-1" }).success).toBe(false);
    expect(salarySchema.safeParse({ ...s, hra: "10.5" }).success).toBe(false);
    expect(salarySchema.safeParse({ ...s, basic: "abc" }).success).toBe(false);
    expect(salarySchema.safeParse({ basic: 1000, hra: 0, allowances: 0, deductions: 2000 }).success).toBe(false);
  });
});

describe("uploads", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
  it("identifies files by content, not by name or declared type", () => {
    expect(sniffType(pdf)).toBe("application/pdf");
    expect(sniffType(png)).toBe("image/png");
    expect(sniffType(jpg)).toBe("image/jpeg");
    expect(sniffType(exe)).toBeNull();
  });
  it("validates type and size", () => {
    expect(validateUpload({ bytes: pdf, allowed: ["application/pdf"], maxBytes: MAX_DOCUMENT_BYTES })).toBe("application/pdf");
    expect(() => validateUpload({ bytes: exe, allowed: ["application/pdf"], maxBytes: 100 })).toThrow(ValidationError);
    expect(() => validateUpload({ bytes: pdf, allowed: ["image/png"], maxBytes: 100 })).toThrow(/PNG/);
    expect(() => validateUpload({ bytes: new Uint8Array(0), allowed: ["application/pdf"], maxBytes: 100 })).toThrow(/empty/);
    expect(() => validateUpload({ bytes: new Uint8Array(200).fill(0x25), allowed: ["application/pdf"], maxBytes: 100 })).toThrow(/too large/);
  });
  it("cleans file names", () => {
    expect(safeFileName("..\\..\\evil/cnic<copy>.pdf")).toBe("cniccopy.pdf");
    expect(safeFileName("   ")).toBe("file");
    expect(safeFileName("a".repeat(300)).length).toBe(120);
  });
});

describe("employee codes and forms", () => {
  it("allocates the next code per prefix", () => {
    expect(nextCodeFrom(["EMP001", "EMP002", "EMP010"], "EMP")).toBe("EMP011");
    expect(nextCodeFrom([], "ADM")).toBe("ADM001");
    expect(nextCodeFrom(["EMPX"], "EMP")).toBe("EMP001");
  });
  it("parses a new-employee form", () => {
    const input = parse(createEmployeeSchema, { firstName: "Ali", lastName: "Raza", email: " ALI@SAUS.EDU.PK ", role: "EMPLOYEE", department: "Accounts", designation: "Clerk", joiningDate: "2026-11-01", employmentType: "FULL_TIME", phone: "", address: "", emergencyContact: "" });
    expect(input.email).toBe("ali@saus.edu.pk");
    expect(input.phone).toBeUndefined();
    expect(() => parse(createEmployeeSchema, { firstName: "Ali", lastName: "Raza", email: "x", role: "ADMIN", department: "A", designation: "B", joiningDate: "2026-13-01", employmentType: "FULL_TIME" })).toThrow(ValidationError);
  });
  it("validates phone numbers", () => {
    expect(() => parse(contactSchema, { firstName: "A", lastName: "B", phone: "call me" })).toThrow(ValidationError);
    expect(parse(contactSchema, { firstName: "A", lastName: "B", phone: "+92 300 1234567" }).phone).toBe("+92 300 1234567");
  });
});

describe("pagination", () => {
  it("clamps values", () => {
    expect(parsePage({ page: "0", pageSize: "1000" })).toMatchObject({ page: 1, pageSize: 100 });
    expect(parsePage({ page: "3", pageSize: "25" })).toMatchObject({ skip: 50, take: 25 });
    expect(pageCount(51, 25)).toBe(3);
  });
});
