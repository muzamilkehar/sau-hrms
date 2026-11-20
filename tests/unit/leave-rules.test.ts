import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { buildCalendarMarks, monthGrid } from "@/lib/calendar";
import { rangesOverlap, validateLeaveRange } from "@/modules/leave/rules";

const today = "2026-11-18"; // Wednesday

describe("validateLeaveRange", () => {
  it("returns the number of working days", () => {
    expect(validateLeaveRange("2026-11-19", "2026-11-23", today)).toBe(3); // Thu, Fri, Mon
    expect(validateLeaveRange("2026-11-18", "2026-11-18", today)).toBe(1);
  });
  it("rejects bad input", () => {
    expect(() => validateLeaveRange("nope", "2026-11-19", today)).toThrow(ValidationError);
    expect(() => validateLeaveRange("2026-11-20", "2026-11-19", today)).toThrow(/before the start/);
  });
  it("allows only a short back-dating window", () => {
    expect(validateLeaveRange("2026-11-11", "2026-11-11", today)).toBe(1);
    expect(() => validateLeaveRange("2026-11-10", "2026-11-10", today)).toThrow(/after the fact/);
  });
  it("limits one request to 30 days", () => {
    expect(() => validateLeaveRange("2026-12-01", "2027-01-05", today)).toThrow(/at most 30/);
    expect(validateLeaveRange("2026-12-01", "2026-12-30", today)).toBe(22);
  });
  it("rejects a range that is only weekend", () => {
    expect(() => validateLeaveRange("2026-11-21", "2026-11-22", today)).toThrow(/weekly off/);
  });
});

describe("overlap", () => {
  it("detects touching and nested ranges", () => {
    const a = { startKey: "2026-11-10", endKey: "2026-11-12" };
    expect(rangesOverlap(a, { startKey: "2026-11-12", endKey: "2026-11-14" })).toBe(true);
    expect(rangesOverlap(a, { startKey: "2026-11-13", endKey: "2026-11-14" })).toBe(false);
    expect(rangesOverlap(a, { startKey: "2026-11-11", endKey: "2026-11-11" })).toBe(true);
  });
});

describe("calendar marks (approved green, rejected red, pending yellow)", () => {
  it("colours each day and lets approved win over pending over rejected", () => {
    const marks = buildCalendarMarks([
      { startKey: "2026-11-02", endKey: "2026-11-04", status: "REJECTED" },
      { startKey: "2026-11-03", endKey: "2026-11-03", status: "PENDING" },
      { startKey: "2026-11-10", endKey: "2026-11-11", status: "APPROVED" },
      { startKey: "2026-11-12", endKey: "2026-11-12", status: "CANCELLED" },
    ], 2026, 11);
    expect(marks.get("2026-11-02")).toBe("REJECTED");
    expect(marks.get("2026-11-03")).toBe("PENDING");
    expect(marks.get("2026-11-04")).toBe("REJECTED");
    expect(marks.get("2026-11-10")).toBe("APPROVED");
    expect(marks.has("2026-11-12")).toBe(false);
  });
  it("clips ranges that cross month boundaries", () => {
    const marks = buildCalendarMarks([{ startKey: "2026-10-30", endKey: "2026-11-02", status: "APPROVED" }], 2026, 11);
    expect([...marks.keys()]).toEqual(["2026-11-01", "2026-11-02"]);
  });
  it("lays out a Monday-first grid", () => {
    const g = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(g.blanks).toBe(6);
    expect(g.days).toHaveLength(30);
    expect(monthGrid(2026, 2).days).toHaveLength(28);
  });
});
