FROM node:24-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./


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
    /app/node_modules/vite \
    /app/node_modules/@types \
    /app/node_modules/terser \
    /app/node_modules/@rollup \
    /app/node_modules/esbuild \
    /app/node_modules/astro \
    /app/node_modules/onnxruntime-node/bin/napi-v3/darwin \
    /app/node_modules/onnxruntime-node/bin/napi-v3/win32 \
    /app/node_modules/onnxruntime-web


FROM base AS build-deps
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
RUN npm run build
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
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["/app/dist/server/entry.mjs"]
