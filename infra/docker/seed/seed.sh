#!/bin/bash
# MongoDB schema + seed for the compose `full` profile (the host-side twin is db/scripts/apply.sh).
set -euo pipefail
for name in catalog notification; do
  uri="mongodb://mongo:27017/bazaar_${name}?directConnection=true"
  for file in schema data; do
    echo "→ ${file} bazaar_${name}"
    # A whole file as one script (stdin would be read line by line as a REPL).
    mongosh "$uri" --quiet --eval "$(cat "/db/${name}/${file}.js")"
  done
done
