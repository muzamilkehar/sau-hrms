import { describe, expect, it } from "vitest";
import { addDays, countWorkingDays, dateKeyOf, dateToKey, diffDays, eachDay, isDateKey, isWeekend, keyToDate } from "@/lib/dates";
import { formatHours } from "@/lib/format";

describe("date keys (Pakistan time)", () => {
  it("assigns an instant to the Pakistan calendar day, not the UTC day", () => {
    // 21:30 UTC on 17 Nov is already 02:30 on 18 Nov in Pakistan (UTC+5)
    expect(dateKeyOf(new Date("2026-11-17T21:30:00Z"))).toBe("2026-11-18");
    expect(dateKeyOf(new Date("2026-11-18T18:59:00Z"))).toBe("2026-11-18");
    expect(dateKeyOf(new Date("2026-11-18T19:00:00Z"))).toBe("2026-11-19");
  });
  it("validates keys strictly", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-2-3")).toBe(false);
    expect(isDateKey(20261118)).toBe(false);
  });
  it("round-trips database dates", () => {
    expect(dateToKey(keyToDate("2026-11-18"))).toBe("2026-11-18");
  });
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-11-01", "2026-11-18")).toBe(17);
  });
  it("lists days inclusively", () => {
    expect(eachDay("2026-11-17", "2026-11-19")).toEqual(["2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(eachDay("2026-11-19", "2026-11-17")).toEqual([]);
  });
  it("treats Saturday and Sunday as weekly off", () => {
    expect(isWeekend("2026-11-21")).toBe(true); // Saturday
    expect(isWeekend("2026-11-22")).toBe(true); // Sunday
    expect(isWeekend("2026-11-20")).toBe(false); // Friday
  });
  it("counts working days", () => {
    expect(countWorkingDays("2026-11-16", "2026-11-22")).toBe(5);
    expect(countWorkingDays("2026-11-21", "2026-11-22")).toBe(0);
    expect(countWorkingDays("2026-11-20", "2026-11-23")).toBe(2); // Fri + Mon
  });
});

describe("format", () => {
  it("formats worked hours", () => {
    expect(formatHours(7.5)).toBe("7h 30m");
    expect(formatHours(0.25)).toBe("0h 15m");
    expect(formatHours(null)).toBe("-");
  });
});
