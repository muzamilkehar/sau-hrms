/**
 * Seed: the first HR/Admin account and, optionally, demo employees with attendance, leave and payroll.
 * Safe to run repeatedly: existing users are never changed.
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD   required on first run
 *   SEED_DEMO_DATA=true + SEED_DEMO_PASSWORD  adds four demo employees
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays, dateToKey, isWeekend, keyToDate, todayKey } from "../src/lib/dates";
import { hashPassword, passwordProblems } from "../src/lib/password";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

interface Person {
  code: string; first: string; last: string; email: string; role: "HR_ADMIN" | "EMPLOYEE"; department: string; designation: string;
  joined: string; type: "FULL_TIME" | "PART_TIME" | "CONTRACT"; phone: string; address: string; salary: [number, number, number, number];
}

async function createPerson(p: Person, password: string, mustChange: boolean) {
  const existing = await prisma.user.findUnique({ where: { email: p.email } });
  if (existing) return null;
  const problems = passwordProblems(password, { email: p.email, name: `${p.first} ${p.last}` });
  if (problems.length) throw new Error(`Password for ${p.email} is not strong enough:\n - ${problems.join("\n - ")}`);
  const id = randomUUID();
  const hash = await hashPassword(password);
  await prisma.user.create({ data: { id, name: `${p.first} ${p.last}`, email: p.email, emailVerified: true, role: p.role, mustChangePassword: mustChange } });
  await prisma.account.create({ data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash } });
  const [basic, hra, allowances, deductions] = p.salary;
  return prisma.employee.create({
    data: {
      userId: id, employeeCode: p.code, firstName: p.first, lastName: p.last, phone: p.phone, address: p.address, designation: p.designation, department: p.department,
      joiningDate: keyToDate(p.joined), employmentType: p.type, salary: { create: { basic, hra, allowances, deductions } },
    },
  });
}

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@saus.edu.pk").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  let admin = null;
  if (adminExists) console.log(`HR/Admin ${adminEmail} already exists; left unchanged.`);
  else {
    if (!adminPassword) throw new Error("Set SEED_ADMIN_PASSWORD in .env to create the first HR/Admin account.");
    admin = await createPerson(
      { code: "ADM001", first: process.env.SEED_ADMIN_FIRST_NAME ?? "Sana", last: process.env.SEED_ADMIN_LAST_NAME ?? "Rehman", email: adminEmail, role: "HR_ADMIN", department: "Human Resources", designation: "HR Manager", joined: "2024-01-15", type: "FULL_TIME", phone: "+92 300 1111111", address: "Shikarpur, Sindh", salary: [90000, 36000, 15000, 9000] },
      adminPassword, false,
    );
    console.log(`Created HR/Admin ${adminEmail} (ADM001).`);
  }
  void admin;

  if (process.env.SEED_DEMO_DATA !== "true") return console.log("Seed complete. (Set SEED_DEMO_DATA=true to add demo employees.)");
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) throw new Error("Set SEED_DEMO_PASSWORD (used for every demo employee) when SEED_DEMO_DATA=true.");

  const people: Person[] = [
    { code: "EMP001", first: "Ayesha", last: "Khan", email: "ayesha.khan@saus.edu.pk", role: "EMPLOYEE", department: "Computer Science", designation: "Lecturer", joined: "2023-06-01", type: "FULL_TIME", phone: "+92 301 2223344", address: "Shikarpur, Sindh", salary: [85000, 34000, 12000, 8500] },
    { code: "EMP002", first: "Bilal", last: "Ahmed", email: "bilal.ahmed@saus.edu.pk", role: "EMPLOYEE", department: "Accounts", designation: "Accountant", joined: "2022-09-12", type: "FULL_TIME", phone: "+92 302 3334455", address: "Sukkur, Sindh", salary: [60000, 24000, 8000, 6000] },
    { code: "EMP003", first: "Maryam", last: "Memon", email: "maryam.memon@saus.edu.pk", role: "EMPLOYEE", department: "Registrar Office", designation: "Assistant Registrar", joined: "2021-03-08", type: "FULL_TIME", phone: "+92 303 4445566", address: "Shikarpur, Sindh", salary: [75000, 30000, 10000, 7500] },
    { code: "EMP004", first: "Imran", last: "Shaikh", email: "imran.shaikh@saus.edu.pk", role: "EMPLOYEE", department: "IT Centre", designation: "Network Engineer", joined: "2024-02-19", type: "CONTRACT", phone: "+92 304 5556677", address: "Larkana, Sindh", salary: [65000, 26000, 9000, 6500] },
  ];
  const created = [];
  for (const p of people) {
    const e = await createPerson(p, demoPassword, false);
    if (e) created.push(e);
  }
  if (!created.length) return console.log("Demo employees already exist.");

  const today = todayKey();
  const at = (key: string, hhmm: string) => new Date(`${key}T${hhmm}:00+05:00`);
  for (const [i, emp] of created.entries()) {
    for (let back = 1; back <= 20; back++) {
      const key = addDays(today, -back);
      if (isWeekend(key) || key < dateToKey(emp.joiningDate)) continue;
      const roll = (back * 7 + i * 3) % 11;
      if (roll === 0) continue; // absent
      const inTime = `0${8 + (roll % 2)}:${String(10 + ((back * 13 + i * 7) % 45)).padStart(2, "0")}`;
      if (roll === 5) { await prisma.attendance.create({ data: { employeeId: emp.id, date: keyToDate(key), checkIn: at(key, inTime), checkOut: at(key, "12:30"), status: "HALF_DAY" } }); continue; }
      await prisma.attendance.create({ data: { employeeId: emp.id, date: keyToDate(key), checkIn: at(key, inTime), checkOut: at(key, `17:${String(5 + ((back * 11) % 40)).padStart(2, "0")}`), status: "PRESENT" } });
    }
  }
  const first = created[0]!;
  const second = created[1]!;
  const mk = (employeeId: string, type: "PAID" | "UNPAID" | "SICK", s: string, e: string, days: number, reason: string, status: "PENDING" | "APPROVED" | "REJECTED", remarks?: string) =>
    prisma.leaveRequest.create({ data: { employeeId, type, startDate: keyToDate(s), endDate: keyToDate(e), days, reason, status, remarks: remarks ?? null, decidedAt: status === "PENDING" ? null : new Date() } });
  await mk(first.id, "PAID", addDays(today, 14), addDays(today, 16), 3, "Family function", "APPROVED");
  await mk(first.id, "SICK", addDays(today, 30), addDays(today, 31), 2, "Medical check-up", "PENDING");
  await mk(first.id, "UNPAID", addDays(today, -12), addDays(today, -10), 3, "Personal work", "REJECTED", "We cannot accept leave approvals right now.");
  await mk(second.id, "PAID", addDays(today, 7), addDays(today, 8), 2, "Travel", "PENDING");
  await prisma.activity.createMany({ data: [
    { type: "SEED", message: "Demo employees were added" },
    { type: "LEAVE_REQUESTED", message: "Bilal Ahmed requested paid leave" },
    { type: "LEAVE_REQUESTED", message: "Ayesha Khan requested sick leave" },
  ] });
  console.log(`Created ${created.length} demo employees with attendance, leave and payroll. They all use SEED_DEMO_PASSWORD.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
