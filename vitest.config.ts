import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Resolve the project's `@/*` tsconfig path aliases natively.
    tsconfigPaths: true,
    alias: {
      // Stub Next.js' `server-only` guard so server modules can be unit-tested.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/**/types.ts"]
    }
  }
});
