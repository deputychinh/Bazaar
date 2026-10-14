# Customer site image (plan §9): Next.js standalone server, non-root. Build from frontend-web/.
# Rewrites and image hosts are fixed at build time, so the in-cluster URLs are build arguments.
ARG NODE_IMAGE=node:24.21.0-trixie-slim

FROM ${NODE_IMAGE} AS build
RUN npm install -g npm@11.19.1 && npm cache clean --force
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG API_BASE_URL=http://gateway:4000
ARG STORAGE_PUBLIC_URL=http://storage.bazaar.localhost
ARG STORAGE_IS_PRIVATE=true
# AWS: STORAGE_PUBLIC_URL=https://images.<domain>, STORAGE_IMAGE_PATH= (CDN serves the bucket root).
ARG STORAGE_IMAGE_PATH=/bazaar-images
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1 \
  API_BASE_URL=${API_BASE_URL} STORAGE_PUBLIC_URL=${STORAGE_PUBLIC_URL} \
  STORAGE_IS_PRIVATE=${STORAGE_IS_PRIVATE} STORAGE_IMAGE_PATH=${STORAGE_IMAGE_PATH}
# public/ may be empty, and git keeps no empty folders: make sure it exists for the copy below.
RUN mkdir -p public && npm run build

FROM ${NODE_IMAGE} AS runtime
# npm, npx, corepack and yarn are build tools: not shipped (smaller image, no CVEs in their deps).
RUN apt-get update && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/* \
    /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn* /opt/yarn-*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3100
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3100/en').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
