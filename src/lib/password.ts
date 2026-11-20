import { createHash, randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

// Argon2id with the library defaults (m=19 MiB, t=2, p=1), as recommended by OWASP.
export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (hashed: string, password: string) => verify(hashed, password);

const COMMON = new Set([
  "password1234", "123456789012", "qwertyuiop12", "administrator", "letmein12345",
  "welcome12345", "changeme1234", "iloveyou1234", "shaikhayaz123", "university123",
]);

export interface PasswordContext {
  email?: string;
  name?: string;
}

/** Returns a list of problems; an empty list means the password is acceptable. */
export function passwordProblems(password: string, ctx: PasswordContext = {}): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN) problems.push(`Use at least ${PASSWORD_MIN} characters.`);
  if (password.length > PASSWORD_MAX) problems.push(`Use at most ${PASSWORD_MAX} characters.`);
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) problems.push("Mix at least three of: lowercase, uppercase, numbers, symbols.");
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) problems.push("This password is too common.");
  if (/^(.)\1+$/.test(password)) problems.push("Do not repeat a single character.");
  const local = ctx.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) problems.push("Do not include your email name.");
  for (const part of (ctx.name ?? "").toLowerCase().split(/\s+/)) {
    if (part.length >= 4 && lower.includes(part)) {
      problems.push("Do not include your name.");
      break;
    }
  }
  return problems;
}

export const newPasswordSchema = (ctx: PasswordContext = {}) =>
  z.string().superRefine((value, issue) => {
    for (const message of passwordProblems(value, ctx)) issue.addIssue({ code: "custom", message });
  });

/**
 * Checks the password against the Have I Been Pwned corpus using the k-anonymity range API
 * (only the first 5 characters of the SHA-1 hash leave the server). Fails open: if the service
 * is unreachable the password is accepted and a warning is logged.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "SAU-ERP-HRMS" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split(/\r?\n/).some((line) => {
      const [s, count] = line.split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch {
    console.warn("[password] breached-password check unavailable; continuing without it");
    return false;
  }
}

/** Random temporary password that always satisfies the policy. */
export function generateTempPassword(length = 16): string {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = lower + upper + digits + symbols;
  const pick = (set: string) => set[randomInt(set.length)]!;
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
