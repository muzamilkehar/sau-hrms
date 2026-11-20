import { config } from "dotenv";
import { beforeAll, beforeEach, afterAll } from "vitest";

// Integration tests need a real PostgreSQL database that is NOT your development database.
// Set TEST_DATABASE_URL in .env. Every table is emptied before each test.
config({ path: ".env" });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://sau:sau@localhost:5432/sau_hr_test";
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
delete process.env.RESEND_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;

if (!/test/i.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error("Refusing to run integration tests: the database name must contain 'test'.");
}

beforeAll(async () => (await import("./helpers")).resetDatabase());
beforeEach(async () => (await import("./helpers")).resetDatabase());
afterAll(async () => (await import("@/lib/db")).prisma.$disconnect());
