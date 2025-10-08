FROM node:22-slim AS base
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
    /app/node_modules/sharp \
    /app/node_modules/@img \
    /app/node_modules/astro


FROM base AS build-deps
RUN npm ci


FROM build-deps AS builder
COPY astro.config.mjs tsconfig.json ./
COPY .astro ./
COPY src ./src
COPY build ./build
COPY public ./public
ENV BUILD_ENV=docker
RUN npm run build
RUN npm run astrobuild


# Final Image
FROM gcr.io/distroless/nodejs22-debian12 AS final
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["/app/dist/server/entry.mjs"]
