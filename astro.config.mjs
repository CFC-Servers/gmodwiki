import { defineConfig } from 'astro/config';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  build: {
      split: true,
  },
  output: "server",
  adapter: cloudflare({
      mode: "advanced"
  }),
});
