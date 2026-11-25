FROM node:24-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip


FROM base AS prod-deps
RUN npm ci --omit=dev
# Remove a bunch of unnecessary stuff to slim down the image
RUN rm -rf \
    /app/node_modules/@astrojs/cloudflare \
    /app/node_modules/typescript \
    /app/node_modules/@shikijs \
    /app/node_modules/@esbuild \
    /app/node_modules/@cloudflare \
    /app/node_modules/fontkit \
    /app/node_modules/@babel \
    /app/node_modules/prismjs \
    /app/node_modules/shiki \
    /app/node_modules/rollup \
    /app/node_modules/rolldown \
    /app/node_modules/@rolldown \
    /app/node_modules/cloudflare \
    /app/node_modules/vitest \
    /app/node_modules/@vitest \
    /app/node_modules/@bruits \
    /app/node_modules/vite \
    /app/node_modules/@types \
    /app/node_modules/terser \
    /app/node_modules/@rollup \
    /app/node_modules/esbuild \
    /app/node_modules/astro \
    /app/node_modules/workerd \
    /app/node_modules/wrangler \
    /app/node_modules/miniflare \
    /app/node_modules/lightningcss* \
    /app/node_modules/@img/*linuxmusl* \
    /app/node_modules/onnxruntime-node/bin/napi-v3/darwin \
    /app/node_modules/onnxruntime-node/bin/napi-v3/win32 \
    /app/node_modules/onnxruntime-node/bin/napi-v3/linux/*/libonnxruntime.so.1.* \
    /app/node_modules/onnxruntime-web
RUN case "$(uname -m)" in \
    x86_64) rm -rf /app/node_modules/onnxruntime-node/bin/napi-v3/linux/arm64 ;; \
    aarch64) rm -rf /app/node_modules/onnxruntime-node/bin/napi-v3/linux/x64 ;; \
    esac


FROM --platform=$BUILDPLATFORM node:24-slim AS build-deps
WORKDIR /app
COPY package.json package-lock.json ./
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
RUN npm ci


FROM build-deps AS builder

# Bake the q8 model
RUN printf '%s\n' \
    'import { pipeline, env } from "@huggingface/transformers";' \
    'env.cacheDir = "/app/hf-cache";' \
    'env.allowRemoteModels = true;' \
    'await pipeline("feature-extraction", "Xenova/bge-base-en-v1.5", { dtype: "q8" });' \
    'console.log("Model baked at /app/hf-cache");' \
    > /app/bake-model.mjs && node /app/bake-model.mjs

COPY astro.config.mjs tsconfig.json ./
COPY .astro ./
COPY src ./src
COPY semantic/core ./semantic/core
COPY semantic/adapters ./semantic/adapters
COPY build ./build
COPY public ./public
ENV BUILD_ENV=docker
ARG SCRAPE_WIKI=false
RUN if [ "$SCRAPE_WIKI" = "true" ]; then npm run build; fi
RUN test -f src/layouts/Layout.astro || (echo "The scraped wiki content is missing. Run 'npm run build' first, or pass --build-arg SCRAPE_WIKI=true." && exit 1)
RUN npm run astrobuild


# Final Image
FROM gcr.io/distroless/nodejs24-debian12 AS final
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/hf-cache /app/hf-cache
ENV MODEL_CACHE_DIR=/app/hf-cache
ENV EMBEDDINGS_BIN=/app/dist/client/embeddings.bin
ENV EMBEDDINGS_MANIFEST=/app/dist/client/embeddings_manifest.json
ENV SEARCH_INDEX=/app/dist/client/search_index.json
ENV CONTENT_DIR=/app/dist/client/content
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["/app/dist/server/entry.mjs"]
