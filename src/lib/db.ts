import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function create(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: getEnv().DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

/** Lazily created singleton so importing this module never needs a database connection. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = (globalForPrisma.__prisma ??= create());
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type { PrismaClient };
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
