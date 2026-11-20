import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations should use a direct (non-pooled) connection; the app itself uses DATABASE_URL.
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://sau:sau@localhost:5432/sau_hr" },
});