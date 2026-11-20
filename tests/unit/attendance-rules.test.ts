import { describe, expect, it } from "vitest";
import { FULL_DAY_HOURS, deriveAttendanceRows, hoursBetween, matchesStatus, recordKey, statusAtCheckout, type RecordLike } from "@/modules/attendance/rules";

const at = (key: string, hhmm: string) => new Date(`${key}T${hhmm}:00+05:00`);

describe("check-out status", () => {
  it("counts a full day from 6 hours and a half-day below it", () => {
    expect(FULL_DAY_HOURS).toBe(6);
    expect(statusAtCheckout(at("2026-11-17", "09:00"), at("2026-11-17", "15:00"))).toBe("PRESENT");
    expect(statusAtCheckout(at("2026-11-17", "09:00"), at("2026-11-17", "14:59"))).toBe("HALF_DAY");
    expect(statusAtCheckout(at("2026-11-17", "10:21"), at("2026-11-17", "10:21"))).toBe("HALF_DAY");
  });
  it("never reports negative hours", () => {
    expect(hoursBetween(at("2026-11-17", "10:00"), at("2026-11-17", "09:00"))).toBe(0);
  });
});

describe("deriveAttendanceRows", () => {
  // Mon 16 Nov to Fri 20 Nov 2026; 21-22 are the weekend; 23 is Monday
  const emp = { id: "e1", joinKey: "2026-01-01" };
  const base = { employees: [emp], from: "2026-11-16", to: "2026-11-23", today: "2026-11-20" };
  const rec = (status: RecordLike["status"], inT: string, outT: string | null): RecordLike => ({ checkIn: at("2026-11-16", inT), checkOut: outT ? at("2026-11-16", outT) : null, status });

  it("marks stored records, approved leave, absences and today without a check-in", () => {
    const records = new Map([[recordKey("e1", "2026-11-16"), rec("PRESENT", "09:00", "17:00")], [recordKey("e1", "2026-11-17"), rec("HALF_DAY", "09:00", "12:00")]]);
    const rows = deriveAttendanceRows({ ...base, records, leaves: [{ employeeId: "e1", startKey: "2026-11-18", endKey: "2026-11-18" }] });
    expect(rows.map((r) => [r.key, r.status])).toEqual([["2026-11-16", "PRESENT"], ["2026-11-17", "HALF_DAY"], ["2026-11-18", "LEAVE"], ["2026-11-19", "ABSENT"], ["2026-11-20", "NOT_YET"]]);
    expect(rows[0]!.hours).toBe(8);
  });
  it("does not produce rows for future days, weekends or days before joining", () => {
    const rows = deriveAttendanceRows({ ...base, employees: [{ id: "e1", joinKey: "2026-11-19" }], records: new Map(), leaves: [] });
    expect(rows.map((r) => r.key)).toEqual(["2026-11-19", "2026-11-20"]);
    expect(deriveAttendanceRows({ ...base, from: "2026-11-21", to: "2026-11-22", records: new Map(), leaves: [] })).toEqual([]);
  });
  it("keeps a stored weekend record but never invents weekend absences", () => {
    const records = new Map([[recordKey("e1", "2026-11-14"), { checkIn: at("2026-11-14", "10:00"), checkOut: null, status: "PRESENT" as const }]]);
    const rows = deriveAttendanceRows({ ...base, from: "2026-11-14", to: "2026-11-15", records, leaves: [] });
    expect(rows.map((r) => r.key)).toEqual(["2026-11-14"]);
  });
  it("filters by status", () => {
    const rows = deriveAttendanceRows({ ...base, records: new Map(), leaves: [] });
    expect(rows.filter((r) => matchesStatus(r, "ABSENT")).length).toBe(4);
    expect(rows.filter((r) => matchesStatus(r, "ALL")).length).toBe(rows.length);
    expect(rows.filter((r) => matchesStatus(r, "PRESENT")).length).toBe(0);
  });
});
