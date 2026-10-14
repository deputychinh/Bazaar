#!/usr/bin/env bash
# Local staging cluster (plan §9.1): kind + local registry + cluster add-ons via Helm.
#   cluster.sh up      create registry and cluster (idempotent), install Traefik, metrics-server, Strimzi
#   cluster.sh down    delete the cluster (the registry and its images are kept)
#   cluster.sh status  nodes, add-ons and Bazaar workloads
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLUSTER=bazaar-staging
REGISTRY_NAME=kind-registry
REGISTRY_PORT=5001
HELM_DIR="$ROOT/infra/k8s/helm"
# Pinned versions: bump on purpose, never implicitly.
TRAEFIK_CHART=41.7.1
METRICS_SERVER_CHART=3.14.0
STRIMZI_CHART=1.3.0

registry_up() {
  if [ "$(docker inspect -f '{{.State.Running}}' "$REGISTRY_NAME" 2>/dev/null || true)" != 'true' ]; then
    docker rm "$REGISTRY_NAME" >/dev/null 2>&1 || true
    docker run -d --restart=always -p "127.0.0.1:${REGISTRY_PORT}:5000" --network bridge \
      --name "$REGISTRY_NAME" registry:3 >/dev/null
    echo "→ registry localhost:${REGISTRY_PORT}"
  fi
}

cluster_up() {
  if ! kind get clusters | grep -qx "$CLUSTER"; then
    kind create cluster --config "$ROOT/infra/k8s/kind/kind-config.yaml"
  fi
  # Nodes pull localhost:5001/* from the registry container (kind's documented local-registry setup).
  for node in $(kind get nodes --name "$CLUSTER"); do
    docker exec "$node" mkdir -p "/etc/containerd/certs.d/localhost:${REGISTRY_PORT}"
    printf '[host."http://%s:5000"]\n' "$REGISTRY_NAME" |
      docker exec -i "$node" cp /dev/stdin "/etc/containerd/certs.d/localhost:${REGISTRY_PORT}/hosts.toml"
  done
  if [ "$(docker inspect -f '{{json .NetworkSettings.Networks.kind}}' "$REGISTRY_NAME")" = 'null' ]; then
    docker network connect kind "$REGISTRY_NAME"
  fi
  kubectl apply -f - >/dev/null <<YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${REGISTRY_PORT}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
YAML
}

addons_up() {
  helm repo add traefik https://traefik.github.io/charts --force-update >/dev/null
  helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ --force-update >/dev/null
  helm repo add strimzi https://strimzi.io/charts/ --force-update >/dev/null
  helm repo update >/dev/null
  echo "→ traefik ${TRAEFIK_CHART}"
  helm upgrade --install traefik traefik/traefik --version "$TRAEFIK_CHART" \
    --namespace traefik --create-namespace -f "$HELM_DIR/traefik.values.yaml" --wait
  echo "→ metrics-server ${METRICS_SERVER_CHART}"
  helm upgrade --install metrics-server metrics-server/metrics-server --version "$METRICS_SERVER_CHART" \
    --namespace kube-system -f "$HELM_DIR/metrics-server.values.yaml" --wait
  # Strimzi needs the namespace it watches to exist before it is installed.
  kubectl create namespace bazaar-data --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  echo "→ strimzi ${STRIMZI_CHART}"
  helm upgrade --install strimzi strimzi/strimzi-kafka-operator --version "$STRIMZI_CHART" \
    --namespace strimzi --create-namespace -f "$HELM_DIR/strimzi.values.yaml" --wait
}

case "${1:-}" in
  up)
    registry_up
    cluster_up
    addons_up
    kubectl get nodes
    ;;
  down)
    kind delete cluster --name "$CLUSTER"
    ;;
  status)
    kubectl get nodes -o wide
    helm list -A
    kubectl get pods -n bazaar -o wide 2>/dev/null || true
    kubectl get pods -n bazaar-data -o wide 2>/dev/null || true
    ;;
  *)
    echo "usage: $0 up|down|status" >&2
    exit 1
    ;;
esac
