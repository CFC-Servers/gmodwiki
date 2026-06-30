import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["semantic/core/**/*.test.ts", "build/**/*.test.ts", "semantic/adapters/**/*.test.ts"],
    environment: "node",
  },
});
