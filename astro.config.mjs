import { defineConfig } from 'astro/config';

import node from '@astrojs/node';
import cloudflare from "@astrojs/cloudflare";

const buildEnv = process.env.BUILD_ENV;

let adapter;

if (buildEnv === "production") {
  console.log("Using Cloudflare adapter");
  adapter = cloudflare({
    mode: "advanced",
    routes: {
      strategy: "include",
      include: ["/*"],
      exclude: [
        "/content/*",
        "/script.js",
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
  console.log("Using Node adapter");
  adapter = node({ mode: "standalone" });
}

export default defineConfig({
  build: { split: true, },
  output: "server",
  adapter: adapter
});
