import { describe, expect, it } from "vitest";
import { generateTempPassword, hashPassword, passwordProblems, verifyPassword } from "@/lib/password";

describe("password policy (AUTH-002)", () => {
  it("rejects short passwords", () => {
    expect(passwordProblems("Ab1!short").join(" ")).toMatch(/at least 12/);
  });
  it("requires three character classes", () => {
    expect(passwordProblems("alllowercaseonly").join(" ")).toMatch(/three of/);
    expect(passwordProblems("Lowercase1Upper")).toEqual([]);
  });
  it("rejects passwords containing the email name or the person's name", () => {
    expect(passwordProblems("muzamil-Secret-99", { email: "muzamil@saus.edu.pk" }).join(" ")).toMatch(/email/);
    expect(passwordProblems("Kehar-Strong-Pass1", { name: "Muzamil Kehar" }).join(" ")).toMatch(/name/);
  });
  it("rejects common passwords", () => {
    expect(passwordProblems("Password1234").length).toBeGreaterThan(0);
  });
  it("accepts a strong password", () => {
    expect(passwordProblems("correct-Horse-battery-7")).toEqual([]);
  });
});

describe("hashing", () => {
  it("hashes with Argon2id and verifies", async () => {
    const hashed = await hashPassword("correct-Horse-battery-7");
    expect(hashed.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hashed, "correct-Horse-battery-7")).toBe(true);
    expect(await verifyPassword(hashed, "wrong-password-123")).toBe(false);
  });
});

describe("generateTempPassword", () => {
  it("always satisfies the policy and is unique", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const p = generateTempPassword();
      expect(passwordProblems(p)).toEqual([]);
      seen.add(p);
    }
    expect(seen.size).toBe(50);
  });
});
