import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addDays, keyToDate, todayKey } from "@/lib/dates";
import { verifyPassword } from "@/lib/password";
import { checkIn, checkOut, getTodayRecord, listAllAttendance, listOwnAttendance } from "@/modules/attendance/service";
import { applyForLeave, cancelLeave, decideLeave, listAllLeave, listOwnLeave } from "@/modules/leave/service";
import { getOwnSalary, listPayroll, updateSalary } from "@/modules/payroll/service";
import { createEmployee, getEmployeeForHr, listEmployees, resetEmployeePassword, setEmployeeActive, updateOwnContact } from "@/modules/employees/service";
import { deleteDocument, getAvatar, getDocumentForDownload, uploadAvatar, uploadDocument } from "@/modules/documents/service";
import { hrDashboard } from "@/modules/dashboard";
import { makeEmployee } from "./helpers";

// A fixed weekday (Wednesday 18 Nov 2026, 10:21 Pakistan time) keeps the tests independent of the real date.
const WED = new Date("2026-11-18T10:21:00+05:00");
const WED_KEY = "2026-11-18";
const pdf = () => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])], "cnic.pdf", { type: "application/pdf" });

describe("attendance", () => {
  it("checks in once, checks out once, and classifies the day", async () => {
    const e = await makeEmployee();
    await checkIn(e.actor, WED);
    await expect(checkIn(e.actor, new Date(WED.getTime() + 60_000))).rejects.toThrow(/already checked in/);
    await checkOut(e.actor, new Date("2026-11-18T17:30:00+05:00"));
    await expect(checkOut(e.actor, new Date("2026-11-18T17:40:00+05:00"))).rejects.toThrow(/already checked out/);
    const rec = await getTodayRecord(e.actor, WED);
    expect(rec?.status).toBe("PRESENT");
  });
  it("marks a short day as a half-day", async () => {
    const e = await makeEmployee();
    await checkIn(e.actor, WED);
    await checkOut(e.actor, new Date("2026-11-18T12:00:00+05:00"));
    expect((await getTodayRecord(e.actor, WED))?.status).toBe("HALF_DAY");
  });
  it("refuses check-out without check-in, weekend check-in, and check-in on approved leave", async () => {
    const e = await makeEmployee();
    await expect(checkOut(e.actor, WED)).rejects.toThrow(/not checked in/);
    await expect(checkIn(e.actor, new Date("2026-11-21T10:00:00+05:00"))).rejects.toThrow(/weekly off/);
    await prisma.leaveRequest.create({ data: { employeeId: e.employeeId, type: "PAID", startDate: keyToDate(WED_KEY), endDate: keyToDate(WED_KEY), days: 1, reason: "x", status: "APPROVED" } });
    await expect(checkIn(e.actor, WED)).rejects.toThrow(/approved leave/);
  });
  it("two simultaneous check-ins create one record", async () => {
    const e = await makeEmployee();
    const r = await Promise.allSettled([checkIn(e.actor, WED), checkIn(e.actor, WED)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.attendance.count({ where: { employeeId: e.employeeId } })).toBe(1);
  });
  it("uses the Pakistan day: a check-in at 00:30 PKT belongs to that day", async () => {
    const e = await makeEmployee();
    const earlyMonday = new Date("2026-11-22T20:30:00Z"); // Mon 23 Nov 01:30 PKT
    await checkIn(e.actor, earlyMonday);
    const rec = await prisma.attendance.findFirstOrThrow({ where: { employeeId: e.employeeId } });
    expect(rec.date.toISOString().slice(0, 10)).toBe("2026-11-23");
  });
  it("HR sees everyone with absent/leave/present filters and date ranges; employees cannot", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const a = await makeEmployee({ first: "Ayesha" });
    const b = await makeEmployee({ first: "Bilal" });
    await checkIn(a.actor, new Date("2026-11-17T09:00:00+05:00"));
    await checkOut(a.actor, new Date("2026-11-17T17:00:00+05:00"));
    await prisma.leaveRequest.create({ data: { employeeId: b.employeeId, type: "SICK", startDate: keyToDate("2026-11-17"), endDate: keyToDate("2026-11-17"), days: 1, reason: "x", status: "APPROVED" } });
    const q = { from: "2026-11-17", to: "2026-11-17", skip: 0, take: 50 };
    expect((await listAllAttendance(hr.actor, { ...q, status: "PRESENT" }, WED)).rows.map((r) => r.employee.firstName)).toEqual(["Ayesha"]);
    expect((await listAllAttendance(hr.actor, { ...q, status: "LEAVE" }, WED)).rows.map((r) => r.employee.firstName)).toEqual(["Bilal"]);
    expect((await listAllAttendance(hr.actor, { ...q, status: "ABSENT" }, WED)).rows.map((r) => r.employee.firstName)).toEqual(["Test"]); // the HR user themselves
    expect((await listAllAttendance(hr.actor, { ...q, status: "ALL", q: "ayesha" }, WED)).total).toBe(1);
    await expect(listAllAttendance(a.actor, { ...q, status: "ALL" }, WED)).rejects.toThrow(/Only HR/);
    expect((await listOwnAttendance(a.actor, 3, WED)).find((r) => r.key === "2026-11-17")?.status).toBe("PRESENT");
  });
});

describe("leave", () => {
  const apply = (actor: Parameters<typeof applyForLeave>[0], s: string, e: string, type: "PAID" | "UNPAID" | "SICK" = "PAID") => applyForLeave(actor, { type, startKey: s, endKey: e, reason: "Family function" }, WED);

  it("creates a pending request, counts working days, and tells HR", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const leave = await apply(e.actor, "2026-11-19", "2026-11-23");
    expect(leave.status).toBe("PENDING");
    expect(leave.days).toBe(3);
    expect(await prisma.notification.count({ where: { userId: hr.userId } })).toBe(1);
    expect((await hrDashboard(hr.actor, WED)).pendingLeaves).toBe(1);
  });
  it("rejects overlaps with pending or approved requests, but allows overlapping a rejected one", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const first = await apply(e.actor, "2026-11-24", "2026-11-26");
    await expect(apply(e.actor, "2026-11-26", "2026-11-27")).rejects.toThrow(/overlap/);
    await decideLeave(hr.actor, first.id, "REJECTED", "Busy period");
    await expect(apply(e.actor, "2026-11-26", "2026-11-27")).resolves.toBeTruthy();
  });
  it("validates ranges and reasons", async () => {
    const e = await makeEmployee();
    await expect(apply(e.actor, "2026-11-20", "2026-11-19")).rejects.toThrow(/before the start/);
    await expect(apply(e.actor, "2026-11-21", "2026-11-22")).rejects.toThrow(/weekly off/);
    await expect(applyForLeave(e.actor, { type: "PAID", startKey: "2026-11-19", endKey: "2026-11-19", reason: " " }, WED)).rejects.toThrow(/reason/i);
  });
  it("HR approves or rejects with optional remarks and the employee is notified", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const a = await apply(e.actor, "2026-11-19", "2026-11-19");
    const b = await apply(e.actor, "2026-11-24", "2026-11-25");
    await decideLeave(hr.actor, a.id, "APPROVED");
    await decideLeave(hr.actor, b.id, "REJECTED", "We cannot accept leave approvals right now.");
    const notes = await prisma.notification.findMany({ where: { userId: e.userId }, orderBy: { createdAt: "asc" } });
    expect(notes[0]!.message).toBe("Your leave request (2026-11-19 \u2192 2026-11-19) was approved");
    expect(notes[1]!.message).toContain('was rejected: "We cannot accept leave approvals right now."');
    expect((await listAllLeave(hr.actor, { status: "APPROVED", skip: 0, take: 10 })).total).toBe(1);
    expect((await listAllLeave(hr.actor, { status: "ALL", skip: 0, take: 10 })).total).toBe(2);
    expect((await listOwnLeave(e.actor)).map((l) => l.status).sort()).toEqual(["APPROVED", "REJECTED"]);
  });
  it("an employee cannot decide leave, and HR cannot decide their own request", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const mine = await apply(hr.actor, "2026-11-19", "2026-11-19");
    const theirs = await apply(e.actor, "2026-11-20", "2026-11-20");
    await expect(decideLeave(e.actor, theirs.id, "APPROVED")).rejects.toThrow(/Only HR/);
    await expect(decideLeave(hr.actor, mine.id, "APPROVED")).rejects.toThrow(/your own/);
  });
  it("a request is decided only once, even when two decisions race", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const l = await apply(e.actor, "2026-11-19", "2026-11-19");
    const r = await Promise.allSettled([decideLeave(hr.actor, l.id, "APPROVED"), decideLeave(hr.actor, l.id, "REJECTED")]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.notification.count({ where: { userId: e.userId } })).toBe(1);
  });
  it("only the owner can cancel, and only while pending", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const other = await makeEmployee();
    const l = await apply(e.actor, "2026-11-19", "2026-11-19");
    await expect(cancelLeave(other.actor, l.id)).rejects.toThrow(/not found/i);
    await cancelLeave(e.actor, l.id);
    expect((await prisma.leaveRequest.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("CANCELLED");
    await expect(decideLeave(hr.actor, l.id, "APPROVED")).rejects.toThrow(/already been decided/);
    await expect(cancelLeave(e.actor, l.id)).rejects.toThrow(/Only pending/);
  });
});

describe("payroll", () => {
  it("HR edits salaries, the change is logged with before and after, and validation holds", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    await updateSalary(hr.actor, e.employeeId, { basic: "60000", hra: "24000", allowances: "10000", deductions: "6000" });
    expect(await getOwnSalary(e.actor)).toMatchObject({ basic: 60000, hra: 24000, allowances: 10000, deductions: 6000 });
    const log = await prisma.activity.findFirstOrThrow({ where: { type: "PAYROLL_UPDATED" } });
    expect(log.details).toMatchObject({ before: { net: 72500 }, after: { net: 88000 } });
    await expect(updateSalary(hr.actor, e.employeeId, { basic: "-5", hra: "0", allowances: "0", deductions: "0" })).rejects.toThrow(/highlighted/);
    await expect(updateSalary(hr.actor, e.employeeId, { basic: "1000", hra: "0", allowances: "0", deductions: "5000" })).rejects.toThrow(/highlighted/);
  });
  it("employees cannot edit or list payroll, and can read only their own salary", async () => {
    const e = await makeEmployee();
    const other = await makeEmployee();
    await expect(updateSalary(e.actor, e.employeeId, { basic: 1, hra: 1, allowances: 1, deductions: 0 })).rejects.toThrow(/Only HR/);
    await expect(listPayroll(e.actor, { skip: 0, take: 10 })).rejects.toThrow(/Only HR/);
    await prisma.salary.update({ where: { employeeId: other.employeeId }, data: { basic: 999999 } });
    expect((await getOwnSalary(e.actor)).basic).toBe(50000);
  });
  it("searches by email or employee ID", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee({ code: "EMP241", email: "muzamil@example.com" });
    expect((await listPayroll(hr.actor, { q: "emp241", skip: 0, take: 10 })).rows.map((r) => r.id)).toEqual([e.employeeId]);
    expect((await listPayroll(hr.actor, { q: "muzamil@", skip: 0, take: 10 })).total).toBe(1);
  });
});

describe("employees", () => {
  it("HR creates an employee with a generated ID, a temporary password and a forced change", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN", code: "ADM001" });
    await makeEmployee({ code: "EMP007" });
    const created = await createEmployee(hr.actor, { firstName: "Sana", lastName: "Memon", email: "sana@saus.edu.pk", role: "EMPLOYEE", designation: "Clerk", department: "Accounts", joiningDate: "2026-11-01", employmentType: "FULL_TIME" });
    expect(created.employeeCode).toBe("EMP008");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "sana@saus.edu.pk" }, include: { accounts: true, employee: { include: { salary: true } } } });
    expect(user.mustChangePassword).toBe(true);
    expect(user.employee?.salary).toBeTruthy();
    expect(await verifyPassword(user.accounts[0]!.password!, created.tempPassword)).toBe(true);
    await expect(createEmployee(hr.actor, { firstName: "X", lastName: "Y", email: "SANA@saus.edu.pk".toLowerCase(), role: "EMPLOYEE", designation: "Clerk", department: "Accounts", joiningDate: "2026-11-01", employmentType: "FULL_TIME" })).rejects.toThrow(/already exists/);
  });
  it("two simultaneous creations get different employee IDs", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const mk = (n: string) => createEmployee(hr.actor, { firstName: n, lastName: "Race", email: `${n}@saus.edu.pk`, role: "EMPLOYEE", designation: "Clerk", department: "Accounts", joiningDate: "2026-11-01", employmentType: "FULL_TIME" });
    const [a, b] = await Promise.all([mk("one"), mk("two")]);
    expect(a.employeeCode).not.toBe(b.employeeCode);
  });
  it("the directory is HR only and searchable by email or ID", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee({ code: "EMP100", email: "find.me@saus.edu.pk" });
    await makeEmployee();
    await expect(listEmployees(e.actor, { skip: 0, take: 10 })).rejects.toThrow(/Only HR/);
    expect((await listEmployees(hr.actor, { q: "EMP100", skip: 0, take: 10 })).rows).toHaveLength(1);
    expect((await listEmployees(hr.actor, { q: "find.me", skip: 0, take: 10 })).rows).toHaveLength(1);
    expect((await listEmployees(hr.actor, { skip: 0, take: 10 })).total).toBe(3);
    await expect(getEmployeeForHr(e.actor, e.employeeId)).rejects.toThrow(/Only HR/);
  });
  it("employees edit only their own contact details", async () => {
    const e = await makeEmployee();
    await updateOwnContact(e.actor, { firstName: "Alice", lastName: "Kumar", phone: "+92 300 1112233", address: "Shikarpur", emergencyContact: "Bob 0300" });
    const row = await prisma.employee.findUniqueOrThrow({ where: { id: e.employeeId }, include: { user: true } });
    expect(row.phone).toBe("+92 300 1112233");
    expect(row.user.name).toBe("Alice Kumar");
    expect(row.designation).toBe("Staff"); // job details stay under HR control
  });
  it("deactivation signs the user out, and the last active HR/Admin cannot be removed", async () => {
    const hr1 = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    await prisma.session.create({ data: { id: "s1", token: "t1", userId: e.userId, expiresAt: new Date(Date.now() + 60_000) } });
    await setEmployeeActive(hr1.actor, e.employeeId, false);
    expect(await prisma.session.count({ where: { userId: e.userId } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: e.userId } })).isActive).toBe(false);
    await expect(setEmployeeActive(hr1.actor, hr1.employeeId, false)).rejects.toThrow(/cannot deactivate your own/);
    // an administrator who is no longer active cannot remove the only remaining active one
    const hr2 = await makeEmployee({ role: "HR_ADMIN" });
    await prisma.user.update({ where: { id: hr2.userId }, data: { isActive: false } });
    await expect(setEmployeeActive(hr2.actor, hr1.employeeId, false)).rejects.toThrow(/At least one active HR/);
    // with a second active admin the first can be deactivated
    await prisma.user.update({ where: { id: hr2.userId }, data: { isActive: true } });
    await setEmployeeActive(hr2.actor, hr1.employeeId, false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: hr1.userId } })).isActive).toBe(false);
  });
  it("password reset gives a new temporary password and signs the user out", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    await prisma.account.create({ data: { id: "a1", accountId: e.userId, providerId: "credential", userId: e.userId, password: "old" } });
    await prisma.user.update({ where: { id: e.userId }, data: { lockedUntil: new Date(Date.now() + 600_000) } });
    const { tempPassword } = await resetEmployeePassword(hr.actor, e.employeeId);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: e.userId }, include: { accounts: true } });
    expect(user.lockedUntil).toBeNull();
    expect(user.mustChangePassword).toBe(true);
    expect(await verifyPassword(user.accounts[0]!.password!, tempPassword)).toBe(true);
  });
});

describe("documents and photos", () => {
  it("stores a verified PDF, serves it to the owner and HR, and hides it from other employees", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const other = await makeEmployee();
    await uploadDocument(e.actor, pdf());
    const doc = await prisma.employeeDocument.findFirstOrThrow({ where: { employeeId: e.employeeId } });
    expect(doc.mimeType).toBe("application/pdf");
    expect((await getDocumentForDownload(e.actor, doc.id)).id).toBe(doc.id);
    expect((await getDocumentForDownload(hr.actor, doc.id)).id).toBe(doc.id);
    await expect(getDocumentForDownload(other.actor, doc.id)).rejects.toThrow(/permission/);
    await expect(deleteDocument(other.actor, doc.id)).rejects.toThrow(/not found/i);
    await deleteDocument(e.actor, doc.id);
    expect(await prisma.employeeDocument.count()).toBe(0);
  });
  it("rejects disguised or oversized files", async () => {
    const e = await makeEmployee();
    await expect(uploadDocument(e.actor, new File([new Uint8Array([0x4d, 0x5a, 0x90, 0])], "virus.pdf", { type: "application/pdf" }))).rejects.toThrow(/accepted/);
    await expect(uploadDocument(e.actor, new File([new Uint8Array(4 * 1024 * 1024 + 1).fill(0x25)], "big.pdf"))).rejects.toThrow(/too large/);
    await expect(uploadDocument(e.actor, null)).rejects.toThrow(/Choose a file/);
  });
  it("avatars accept images only and are visible to the owner and HR only", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    const other = await makeEmployee();
    await expect(uploadAvatar(e.actor, pdf())).rejects.toThrow(/PNG/);
    await uploadAvatar(e.actor, new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])], "me.png"));
    expect((await getAvatar(e.actor, e.employeeId)).type).toBe("image/png");
    expect((await getAvatar(hr.actor, e.employeeId)).type).toBe("image/png");
    await expect(getAvatar(other.actor, e.employeeId)).rejects.toThrow(/permission/);
  });
});

describe("HR dashboard", () => {
  it("counts employees, present today and pending leave, and lists activity", async () => {
    const hr = await makeEmployee({ role: "HR_ADMIN" });
    const e = await makeEmployee();
    await makeEmployee();
    await checkIn(e.actor, WED);
    await applyForLeave(e.actor, { type: "SICK", startKey: addDays(todayKey(WED), 1), endKey: addDays(todayKey(WED), 1), reason: "Fever" }, WED);
    const d = await hrDashboard(hr.actor, WED);
    expect(d).toMatchObject({ employees: 3, presentToday: 1, pendingLeaves: 1 });
    expect(d.activity.map((a) => a.type).sort()).toEqual(["CHECK_IN", "LEAVE_REQUESTED"]);
    await expect(hrDashboard(e.actor, WED)).rejects.toThrow(/Only HR/);
  });
});
