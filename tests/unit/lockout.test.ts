import { describe, expect, it } from "vitest";
import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, isLocked, nextLockoutState } from "@/lib/auth";

describe("account lockout", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  it("counts failures below the threshold without locking", () => {
    expect(nextLockoutState(0, now)).toEqual({ failedLoginCount: 1, lockedUntil: null, justLocked: false });
  });
  it("locks for 15 minutes on the 5th failure", () => {
    const d = nextLockoutState(MAX_FAILED_ATTEMPTS - 1, now);
    expect(d.justLocked).toBe(true);
    expect(d.lockedUntil?.getTime()).toBe(now.getTime() + LOCKOUT_MINUTES * 60_000);
  });
  it("knows when a lock has expired", () => {
    expect(isLocked(new Date(now.getTime() + 1000), now)).toBe(true);
    expect(isLocked(new Date(now.getTime() - 1000), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });
});
