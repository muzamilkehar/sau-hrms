import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      {
        resolve: { alias },
        test: { name: "integration", include: ["tests/integration/**/*.test.ts"], environment: "node", fileParallelism: false, testTimeout: 30000, hookTimeout: 30000, setupFiles: ["tests/integration/setup.ts"] },
      },
    ],
    coverage: { provider: "v8", include: ["src/modules/**", "src/lib/**"], exclude: ["src/generated/**", "src/lib/auth-client.ts"] },
  },
});
