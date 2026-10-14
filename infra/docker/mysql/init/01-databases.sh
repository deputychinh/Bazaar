#!/bin/bash
# One database and one user per service (plan DS-02). Runs once, on an empty data volume.
# The MySQL entrypoint *sources* this file when it is not executable (Kubernetes ConfigMap) and
# runs it otherwise (compose bind mount). Sourced, it must use the entrypoint's own client, which
# knows the temporary server's socket; and it must not `set -u`, which would leak into the
# entrypoint. A failing statement still stops the entrypoint (it runs with `set -e`).
run_sql() {
  if declare -F docker_process_sql > /dev/null; then
    docker_process_sql "$@"
  else
    mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" "$@"
  fi
}

run_sql <<SQL
CREATE DATABASE IF NOT EXISTS bazaar_identity CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS bazaar_order CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Throw-away databases Prisma migrate uses to detect drift.
CREATE DATABASE IF NOT EXISTS bazaar_identity_shadow;
CREATE DATABASE IF NOT EXISTS bazaar_order_shadow;
CREATE USER IF NOT EXISTS '${IDENTITY_DB_USER}'@'%' IDENTIFIED BY '${IDENTITY_DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${ORDER_DB_USER}'@'%' IDENTIFIED BY '${ORDER_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON bazaar_identity.* TO '${IDENTITY_DB_USER}'@'%';
GRANT ALL PRIVILEGES ON bazaar_order.* TO '${ORDER_DB_USER}'@'%';
GRANT ALL PRIVILEGES ON \`bazaar_identity_shadow%\`.* TO '${IDENTITY_DB_USER}'@'%';
GRANT ALL PRIVILEGES ON \`bazaar_order_shadow%\`.* TO '${ORDER_DB_USER}'@'%';
FLUSH PRIVILEGES;
SQL
