# One image recipe for every NestJS service (plan §9). Build from backend/:
#   docker build --build-arg SERVICE=gateway --build-arg PORT=4000 -t bazaar/gateway .
# Targets: `runtime` (default, the service) and `migrate` (Prisma CLI + schema, for the migration Job).
ARG NODE_IMAGE=node:24.21.0-trixie-slim

FROM ${NODE_IMAGE} AS base
# openssl: Prisma query engine · tini: PID 1 that forwards SIGTERM so Nest shuts down cleanly.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g npm@11.19.1 \
  && npm cache clean --force
WORKDIR /app

# Only the service and the workspace packages it depends on (contracts, nest-common).
FROM base AS prune
ARG SERVICE
COPY . .
# turbo prune keeps workspaces only; the shared compiler settings live at the root.
RUN npx --yes turbo@2.11.7 prune "@bazaar/${SERVICE}" --docker \
  && cp tsconfig.base.json turbo.json out/full/

FROM base AS build
ARG SERVICE
COPY --from=prune /app/out/json/ ./
RUN npm ci --no-audit --no-fund
COPY --from=prune /app/out/full/ ./
RUN npx turbo run build --filter="@bazaar/${SERVICE}"

# Production dependencies only, installed fresh from the same lockfile.
FROM base AS deps
COPY --from=prune /app/out/json/ ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM build AS migrate
ARG SERVICE
WORKDIR /app/services/${SERVICE}
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM ${NODE_IMAGE} AS runtime
# npm, npx, corepack and yarn are build tools: not shipped (smaller image, no CVEs in their deps).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
    /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn* /opt/yarn-*
WORKDIR /app
ARG SERVICE
# The service's port (gateway 4000, catalog 4010, order 4020, notification 4030).
ARG PORT
ENV NODE_ENV=production PORT=${PORT}
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /app/packages/nest-common/package.json ./packages/nest-common/package.json
COPY --from=build --chown=node:node /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --from=build --chown=node:node /app/services/${SERVICE}/package.json ./services/${SERVICE}/package.json
COPY --from=build --chown=node:node /app/services/${SERVICE}/dist ./services/${SERVICE}/dist
COPY --from=build --chown=node:node /app/services/${SERVICE}/generated ./services/${SERVICE}/generated
WORKDIR /app/services/${SERVICE}
USER node
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/health/live`).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/main.js"]
