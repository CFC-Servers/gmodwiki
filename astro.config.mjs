import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";
import playformCompress from "@playform/compress";

const buildsForCloudflare = process.env.BUILD_ENV === "production";

const adapter = buildsForCloudflare
  ? cloudflare({ imageService: "passthrough" })
  : node({ mode: "standalone" });

const platformModule = buildsForCloudflare
  ? "./src/platform/cloudflare.ts"
  : "./src/platform/node.ts";

console.log(`Building for the ${buildsForCloudflare ? "Cloudflare" : "Node"} adapter`);

export default defineConfig({
  output: "server",
  adapter: adapter,
  compressHTML: true,
  session: false,

  vite: {
    resolve: {
      alias: {
        "@platform": fileURLToPath(new URL(platformModule, import.meta.url)),
      },
    },
  },

  integrations: [playformCompress({
    Image: false
  })]
});
