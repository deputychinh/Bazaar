#!/usr/bin/env bash
# Applies db files inside the running compose containers.
#   apply.sh schema   → every <db>/schema.js (MongoDB)
#   apply.sh data     → every <db>/data.sql (MySQL) and <db>/data.js (MongoDB)
#   apply.sh drop     → drops every Bazaar database (used by `make db-reset`)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB_DIR="$ROOT/backend/db"
COMPOSE=(docker compose --project-directory "$ROOT")
set -a; source "$ROOT/.env"; set +a

MYSQL_DATABASES=(identity order)
MONGO_DATABASES=(catalog notification)

mysql_exec() { "${COMPOSE[@]}" exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql mysql -uroot "$@"; }
mongo_exec() { "${COMPOSE[@]}" exec -T mongo mongosh --quiet "$@"; }

case "${1:-}" in
  schema)
    for name in "${MONGO_DATABASES[@]}"; do
      file="$DB_DIR/$name/schema.js"
      [[ -f "$file" ]] || continue
      echo "→ schema  bazaar_$name"
      mongo_exec "bazaar_$name" < "$file"
    done
    ;;
  data)
    for name in "${MYSQL_DATABASES[@]}"; do
      file="$DB_DIR/$name/data.sql"
      [[ -f "$file" ]] || continue
      echo "→ seed    bazaar_$name"
      mysql_exec "bazaar_$name" < "$file"
    done
    for name in "${MONGO_DATABASES[@]}"; do
      file="$DB_DIR/$name/data.js"
      [[ -f "$file" ]] || continue
      echo "→ seed    bazaar_$name"
      mongo_exec "bazaar_$name" < "$file"
    done
    ;;
  drop)
    for name in "${MYSQL_DATABASES[@]}"; do
      echo "→ drop    bazaar_$name"
      mysql_exec -e "DROP DATABASE IF EXISTS bazaar_$name; CREATE DATABASE bazaar_$name CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
    done
    for name in "${MONGO_DATABASES[@]}"; do
      echo "→ drop    bazaar_$name"
      mongo_exec "bazaar_$name" --eval 'db.dropDatabase()'
    done
    ;;
  *)
    echo "usage: $0 schema|data|drop" >&2
    exit 1
    ;;
esac
