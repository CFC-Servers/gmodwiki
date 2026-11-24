import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";
import playformCompress from "@playform/compress";

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

// Keep transformers.js/onnxruntime-node out of the CF Worker bundle
const viteSSRExternal = buildEnv === "production"
  ? ["@huggingface/transformers", "onnxruntime-node"]
  : [];

export default defineConfig({
  build: buildConfig,
  output: "server",
  adapter: adapter,
  compressHTML: true,

  vite : {
    ssr: {
      external: viteSSRExternal,
    },
  },

  integrations: [playformCompress({
    Image: false
  })]
});
