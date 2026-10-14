# Admin site image (plan §9): static Vite build on unprivileged nginx. Build from frontend-admin/.
# /api is routed to the gateway by whatever sits in front (Traefik ingress, compose proxy).
ARG NODE_IMAGE=node:24.21.0-trixie-slim

FROM ${NODE_IMAGE} AS build
RUN npm install -g npm@11.19.1 && npm cache clean --force
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx vite build

FROM nginxinc/nginx-unprivileged:1.31.6-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD ["wget", "-qO-", "http://127.0.0.1:8080/healthz"]
