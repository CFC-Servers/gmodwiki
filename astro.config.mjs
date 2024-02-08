import { defineConfig } from 'astro/config';

import node from '@astrojs/node';
import cloudflare from "@astrojs/cloudflare";

const buildEnv = process.env.BUILD_ENV;

let adapter;
const buildConfig = { split: true };

if (buildEnv === "production") {
  console.log("Building for Cloudflare adapter");
  adapter = cloudflare({
    mode: "advanced",
    routes: {
      strategy: "include",
      include: ["/*"],
      exclude: [
        "/content/*",
        "/script.js",
        "/search_index.json",
        "/~pagelist.json",
        "/styles/gmod.css",
        "/wiki/files/*",
        "/rubat/*",
        "/lewis/*",
        "/garry/*",
        "/fonts/*"
      ]
    }
  });
} else {
  console.log("Building for Node adapter");
  adapter = node({ mode: "standalone" });
  
  buildConfig.rollupOptions = {
    external: ["fs", "node:fs", "path", "node:path"]
  }
}

export default defineConfig({
  build: buildConfig,
  output: "server",
  adapter: adapter
});
