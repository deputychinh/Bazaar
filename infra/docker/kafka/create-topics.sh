#!/bin/sh
# Creates every topic listed in topics.txt (idempotent).
set -eu
BOOTSTRAP="${BOOTSTRAP:-kafka:9092}"
grep -v '^#' /topics.txt | grep -v '^[[:space:]]*$' | while read -r name partitions retention; do
  config=""
  if [ -n "${retention:-}" ]; then config="--config retention.ms=${retention}"; fi
  # shellcheck disable=SC2086
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" --create --if-not-exists \
    --topic "$name" --partitions "$partitions" --replication-factor 1 $config
done
echo "topics ready"
