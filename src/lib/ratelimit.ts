import { Redis } from "@upstash/redis";

/**
 * Fixed-window rate limiter (SEC-010). Uses Upstash Redis when configured (shared across all
 * serverless instances) and falls back to per-process memory for local development.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number | null;
}

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

const memory = new Map<string, { count: number; resetAt: number }>();

export async function consume(key: string, rule: { window: number; max: number }): Promise<RateLimitResult> {
  const r = getRedis();
  if (r) {
    const redisKey = `rl:${key}`;
    const count = await r.incr(redisKey);
    if (count === 1) await r.expire(redisKey, rule.window);
    if (count > rule.max) {
      const ttl = await r.ttl(redisKey);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : rule.window };
    }
    return { allowed: true, retryAfter: null };
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.window * 1000 });
    return { allowed: true, retryAfter: null };
  }
  entry.count += 1;
  if (entry.count > rule.max) return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { allowed: true, retryAfter: null };
}

/** Test helper. */
export function _resetMemoryLimiter() {
  memory.clear();
}
