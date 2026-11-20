import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("SAU ERP <no-reply@saus.edu.pk>"),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated environment. Called lazily (not at import time) so that
 * `next build` does not need production secrets.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && !(parsed.data.UPSTASH_REDIS_REST_URL && parsed.data.UPSTASH_REDIS_REST_TOKEN)) {
    console.warn("[env] UPSTASH_REDIS_REST_URL/TOKEN not set: rate limiting is per-instance only. Configure Upstash for production.");
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";
