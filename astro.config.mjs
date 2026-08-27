import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import playformCompress from "@playform/compress";

const buildConfig = {
  split: true,
  rollupOptions: {
    external: ["fs", "node:fs", "path", "node:path"],
  },
};

const DEFAULT_OPTIONS = {
  includePublic: true,
  svg: {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupNumericValues: true,
            cleanupIds: {
              minify: true,
              remove: true,
            },
            convertPathData: true,
          },
        },
      },
      'sortAttrs',
      {
        name: 'addAttributesToSVGElement',
        params: {
          attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
        },
      },
    ],
  },
  png: {
    quality: 90,
  },
  jpeg: {
    quality: 90,
  },
  jpg: {
    quality: 90,
  },
  tiff: {
    quality: 90,
  },
  gif: {},
  webp: {
    lossless: false,
    quality: 80,
  },
  avif: {
    lossless: false,
  },
  cache: false,
  cacheLocation: undefined,
};

export default defineConfig({
  build: buildConfig,
  output: "server",
  adapter: node({ mode: "standalone" }),
  compressHTML: true,

  // The API is intentionally open (no accounts/auth), so origin-based CSRF
  // blocking only breaks curl/scripts without protecting anything.
  security: {
    checkOrigin: false,
  },

  vite : {
    plugins: [
      ViteImageOptimizer(DEFAULT_OPTIONS)
    ],
  },

  integrations: [playformCompress({
    Image: false
  })]
});
