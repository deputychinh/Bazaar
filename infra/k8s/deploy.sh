#!/usr/bin/env bash
# Releases one git sha to the local kind cluster (plan §0.2 staging), in order:
#   1. data stores (namespace bazaar-data) and wait until they serve
#   2. db-setup Job (migrations + seed) and wait until it completes
#   3. the apps, then wait for every rollout
# Usage: deploy.sh <tag>   (images localhost:5001/bazaar/<app>:<tag> must be in the registry)
# Rolling back = deploying an earlier tag: migrations only move forward, so keep them additive.
set -euo pipefail

TAG="${1:?usage: deploy.sh <tag>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OVERLAY="$HERE/overlays/local"
REGISTRY=localhost:5001
# The release kustomization sits outside the overlay (kustomize refuses a root inside another).
RELEASE="$HERE/.release"
RENDERED="$RELEASE/rendered.yaml"

"$OVERLAY/secrets.sh"
mkdir -p "$RELEASE"
{
  echo 'apiVersion: kustomize.config.k8s.io/v1beta1'
  echo 'kind: Kustomization'
  echo 'resources: [../overlays/local]'
  echo 'images:'
  for app in gateway catalog order notification gateway-migrate order-migrate web admin; do
    echo "  - { name: bazaar/$app, newName: $REGISTRY/bazaar/$app, newTag: '$TAG' }"
  done
} > "$RELEASE/kustomization.yaml"
kubectl kustomize --load-restrictor LoadRestrictionsNone "$RELEASE" > "$RENDERED"

echo "→ data stores"
kubectl apply -f "$RENDERED" -l bazaar.dev/phase=data
for store in mysql mongo redis storage; do
  kubectl -n bazaar-data rollout status "statefulset/$store" --timeout=300s
done
kubectl -n bazaar-data wait kafka/bazaar --for=condition=Ready --timeout=600s
kubectl -n bazaar-data wait job/storage-init --for=condition=Complete --timeout=300s

echo "→ db-setup ($TAG)"
kubectl -n bazaar-data delete job db-setup --ignore-not-found
kubectl apply -f "$RENDERED" -l bazaar.dev/phase=setup
if ! kubectl -n bazaar-data wait job/db-setup --for=condition=Complete --timeout=600s; then
  kubectl -n bazaar-data logs job/db-setup --all-containers --tail=50 || true
  exit 1
fi

echo "→ apps ($TAG)"
kubectl apply -f "$RENDERED"
for app in gateway catalog order notification web admin; do
  kubectl -n bazaar rollout status "deployment/$app" --timeout=300s
done
kubectl -n bazaar annotate namespace bazaar bazaar.dev/released-tag="$TAG" --overwrite >/dev/null
echo "released $TAG → http://bazaar.localhost · http://admin.bazaar.localhost"
