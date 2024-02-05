import { defineConfig } from 'astro/config';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  build: {
      split: true,
  },
  output: "server",
  adapter: cloudflare({
      mode: "advanced",
      routes: {
        strategy: "include",
        include: ["/*"],
        exclude: [
          "/script.js",
          "/styles/gmod.css",
          "/wiki/files/*",
          "/rubat/*",
          "/lewis/*",
          "/garry/*",
          "/fonts/*",
          "/*.json"
        ]
      }
  }),
});
