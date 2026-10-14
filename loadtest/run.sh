#!/usr/bin/env bash
# `make load-test`: the k6 scenarios against the kind staging cluster (plan §10, NFR-02/03).
# Every request comes from this one machine, so the gateway's per-IP rate limits are raised for the
# run and restored afterwards (trap). Summaries land in loadtest/results/ (git-ignored).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
RESULTS="$HERE/results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS"

restore() {
  kubectl -n bazaar set env deployment/gateway RATE_LIMIT_DEFAULT_PER_MINUTE- RATE_LIMIT_STRICT_PER_MINUTE- >/dev/null
  kubectl -n bazaar rollout status deployment/gateway --timeout=180s >/dev/null
  echo "→ gateway rate limits restored"
}
trap restore EXIT

echo "→ raising gateway rate limits for the run"
kubectl -n bazaar set env deployment/gateway RATE_LIMIT_DEFAULT_PER_MINUTE=1000000 RATE_LIMIT_STRICT_PER_MINUTE=1000 >/dev/null
kubectl -n bazaar rollout status deployment/gateway --timeout=180s >/dev/null

for scenario in ${SCENARIOS:-api-reads product-page checkout}; do
  echo "→ $scenario"
  k6 run --quiet --summary-export "$RESULTS/$scenario.json" "$HERE/$scenario.js" || status=$?
done
echo "summaries: $RESULTS"
exit "${status:-0}"
