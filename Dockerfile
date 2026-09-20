# syntax=docker/dockerfile:1

# Multi-stage build for the role-dashboard Nuxt 4 SPA.
#   deps   — install ALL dependencies (nuxt build needs devDependencies)
#   build  — produce the self-contained Nitro bundle in .output/
#   runner — node:22-alpine running only .output/ as the non-root node user
#
# Runtime config is read at container start (Nuxt NUXT_* env convention), so one
# image serves every environment: NUXT_ALCHEMY_API_KEY, NUXT_INDEXER_URL,
# NUXT_PUBLIC_CLUSTER, ... — changing them never needs a rebuild.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
# No curl in alpine; busybox wget exits non-zero unless `/` answers 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", ".output/server/index.mjs"]
