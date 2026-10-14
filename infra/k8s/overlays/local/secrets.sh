#!/usr/bin/env bash
# Builds the local overlay's secret inputs from the repo's .env (plan §9.2: secretGenerator from
# .env locally; External Secrets on AWS). Output goes to .generated/ (git-ignored).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
OUT="$HERE/.generated"
set -a; source "$ROOT/.env"; set +a
mkdir -p "$OUT"
umask 077

# In-cluster addresses of the stores in namespace bazaar-data.
cat > "$OUT/secrets.env" <<ENV
IDENTITY_DATABASE_URL=mysql://${IDENTITY_DB_USER}:${IDENTITY_DB_PASSWORD}@mysql.bazaar-data.svc:3306/bazaar_identity
ORDER_DATABASE_URL=mysql://${ORDER_DB_USER}:${ORDER_DB_PASSWORD}@mysql.bazaar-data.svc:3306/bazaar_order
CATALOG_DATABASE_URL=mongodb://mongo.bazaar-data.svc:27017/bazaar_catalog?directConnection=true&replicaSet=rs0
NOTIFICATION_DATABASE_URL=mongodb://mongo.bazaar-data.svc:27017/bazaar_notification?directConnection=true&replicaSet=rs0
REDIS_URL=redis://:${REDIS_PASSWORD}@redis.bazaar-data.svc:6379
INTERNAL_API_KEY=${INTERNAL_API_KEY}
REVALIDATE_SECRET=${REVALIDATE_SECRET}
STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY}
STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY}
ENV

cat > "$OUT/data-secrets.env" <<ENV
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
IDENTITY_DB_USER=${IDENTITY_DB_USER}
IDENTITY_DB_PASSWORD=${IDENTITY_DB_PASSWORD}
ORDER_DB_USER=${ORDER_DB_USER}
ORDER_DB_PASSWORD=${ORDER_DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY}
STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY}
ENV

cp "$ROOT/backend/services/gateway/.secrets/jwt-private.pem" "$ROOT/backend/services/gateway/.secrets/jwt-public.pem" "$OUT/"
echo "→ secrets in ${OUT#"$ROOT"/}"
