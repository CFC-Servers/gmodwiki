import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": fileURLToPath(new URL("./src/platform/testing/cloudflare_workers.ts", import.meta.url)),
      "@platform": fileURLToPath(new URL("./src/platform/node.ts", import.meta.url)),
    },
  },

  test: {
    include: ["semantic/core/**/*.test.ts", "build/**/*.test.ts", "semantic/adapters/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
  },
});
