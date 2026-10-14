#!/bin/bash
# One database and one user per service (plan DS-02). Runs once, on an empty data volume.
# No `set -u` here: the MySQL entrypoint *sources* scripts it cannot execute (a ConfigMap mounted
# without exec bits), and the option would leak into it and crash it mid-init. A failing mysql
# command still stops the entrypoint, which runs with `set -e`.
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
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
