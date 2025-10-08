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
    routes: {
      extend: {
        include: [{ pattern: "/*" }],
        exclude: [
          { pattern: "/content/*" },
          { pattern: "/script.js" },
          { pattern: "/search_index.json" },
          { pattern: "/~pagelist.json" },
          { pattern: "/styles/gmod.css" },
          { pattern: "/wiki/files/*" },
          { pattern: "/rubat/*" },
          { pattern: "/lewis/*" },
          { pattern: "/garry/*" },
          { pattern: "/fonts/*" },
          { pattern: "/*.webp" },
          { pattern: "/cdn-cgi/*" },
          { pattern: "/last_build.txt" },
        ],
      },
    },
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
