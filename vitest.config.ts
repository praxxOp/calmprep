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
      // Exclude framework glue / config that is integration-tested, not unit-tested:
      // thin SDK client factories, Next.js cookie+middleware code, env access, and static config.
      exclude: [
        "lib/**/*.test.ts",
        "lib/**/types.ts",
        "lib/env.ts",
        "lib/fonts.ts",
        "lib/themes.ts",
        "lib/supabase/**",
        "lib/gemini/client.ts",
        "lib/gemini/companion.ts",
        "lib/wellness/queries.ts"
      ]
    }
  }
});
