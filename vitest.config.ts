import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Rules tests talk to a single shared emulator instance, so they must not
    // run in parallel with each other. `npm run test:rules` scopes to tests/rules.
    fileParallelism: false,
  },
});
