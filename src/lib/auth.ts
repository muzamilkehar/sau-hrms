import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { prisma } from "@/lib/db";
import { getEnv, isProd } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";
import { consume } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";

export const SESSION_IDLE_SECONDS = 60 * 30; // signed out after 30 minutes without activity
export const SESSION_ABSOLUTE_MS = 1000 * 60 * 60 * 12; // and after 12 hours regardless
export const COOKIE_PREFIX = "sau";
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

/** After 5 consecutive failures the account locks for 15 minutes. */
export function nextLockoutState(currentFailures: number, now: Date = new Date()) {
  const failedLoginCount = currentFailures + 1;
  if (failedLoginCount >= MAX_FAILED_ATTEMPTS) return { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000), justLocked: true };
  return { failedLoginCount, lockedUntil: null, justLocked: false };
}
export const isLocked = (until: Date | null | undefined, now: Date = new Date()) => !!until && until.getTime() > now.getTime();

function createAuth() {
  const env = getEnv();
  return betterAuth({
    appName: "SAU HR Portal",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // HR creates every account
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      password: { hash: hashPassword, verify: ({ hash, password }) => verifyPassword(hash, password) },
      sendResetPassword: async ({ user, url }) => {
        const mail = renderEmail({
          title: "Reset your SAU HR Portal password",
          paragraphs: [`Hello ${user.name}, we received a request to reset your password. The link below is valid for one hour and can be used once.`],
          cta: { label: "Choose a new password", url },
          footnote: "If you did not ask for this, ignore this email; your password will not change.",
        });
        await sendEmail({ to: user.email, ...mail });
      },
      onPasswordReset: async ({ user }) => {
        await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false, failedLoginCount: 0, lockedUntil: null } });
      },
    },
    session: { expiresIn: SESSION_IDLE_SECONDS, updateAge: 60, freshAge: 60 * 10, cookieCache: { enabled: true, maxAge: 50 } },
    plugins: [nextCookies()],
    rateLimit: {
      enabled: env.NODE_ENV !== "test",
      window: 60,
      max: 100,
      customStorage: { consume },
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/request-password-reset": { window: 300, max: 4 },
        "/reset-password": { window: 300, max: 6 },
      },
    },
    advanced: {
      cookiePrefix: COOKIE_PREFIX,
      useSecureCookies: isProd(),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProd() },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = normalizeEmail((ctx.body as { email?: unknown } | undefined)?.email);
        if (!email) return;
        const user = await prisma.user.findUnique({ where: { email }, select: { isActive: true, lockedUntil: true } });
        if (!user) return;
        if (!user.isActive) throw new APIError("UNAUTHORIZED", { message: "Invalid email or password." });
        if (isLocked(user.lockedUntil)) {
          const mins = Math.max(1, Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 60_000));
          throw new APIError("FORBIDDEN", { message: `Too many failed attempts. Try again in ${mins} minute(s) or ask HR to unlock your account.` });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = normalizeEmail((ctx.body as { email?: unknown } | undefined)?.email);
        const returned = ctx.context.returned;
        if (isAPIError(returned)) {
          const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true, failedLoginCount: true, lockedUntil: true } }) : null;
          if (user && user.isActive && !isLocked(user.lockedUntil)) {
            const d = nextLockoutState(user.failedLoginCount);
            await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: d.failedLoginCount, lockedUntil: d.lockedUntil } });
          }
          return;
        }
        const userId = ctx.context.newSession?.user?.id;
        if (userId) await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
      }),
    },
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { __auth?: Auth };

/** Created lazily so importing this module never needs environment variables (keeps `next build` simple). */
export function getAuth(): Auth {
  return (globalForAuth.__auth ??= createAuth());
}
