import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";

const buildEnv = process.env.BUILD_ENV;

let adapter;
const buildConfig = { split: true };

if (buildEnv === "production") {
  console.log("Building for Cloudflare adapter");
  adapter = cloudflare({
    imageService: "passthrough",
  });
} else {
  console.log("Building for Node adapter");
  adapter = node({ mode: "standalone" });

  buildConfig.rollupOptions = {
    external: ["fs", "node:fs", "path", "node:path"],
  };
}

export default defineConfig({
  build: buildConfig,
  output: "server",
  adapter: adapter,
});
