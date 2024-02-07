FROM node:21 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends python3-minimal && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json /app
COPY package-lock.json /app
RUN npm install

COPY ./build ./build
COPY ./public ./public
COPY astro.config.mjs .
COPY tsconfig.json .
COPY src ./src

ENV BUILD_ENV=docker
RUN npm run build
RUN npm run astrobuild

FROM node:21-alpine
WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production
CMD ["node", "/app/dist/server/entry.mjs"]
