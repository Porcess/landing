import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/** Resolves the `@/*` alias exactly as the Next.js build and tsconfig do. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Explicit rather than inherited: this shell may already export
    // NODE_ENV=production, and React then resolves its production build, which
    // has no `act` for the testing library to use.
    env: { NODE_ENV: "test" },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
