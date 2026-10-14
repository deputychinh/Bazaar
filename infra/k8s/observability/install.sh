#!/usr/bin/env bash
# Observability on the kind cluster (plan §9.3): metrics, logs, traces in namespace `observability`.
# Separate from `make k8s-up` because it needs ~2 GB more memory. `make k8s-observability`.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
NS=observability
# Pinned versions: bump on purpose, never implicitly.
KUBE_PROMETHEUS_STACK=92.4.0
LOKI=7.3.0
TEMPO=1.24.4
ALLOY=1.13.1
OTEL_COLLECTOR=0.176.0

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update >/dev/null
helm repo add grafana https://grafana.github.io/helm-charts --force-update >/dev/null
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts --force-update >/dev/null
helm repo update >/dev/null

install() {
  local release=$1 chart=$2 version=$3
  echo "→ $release $version"
  helm upgrade --install "$release" "$chart" --version "$version" --namespace "$NS" --create-namespace \
    -f "$HERE/$release.values.yaml" --wait --timeout 10m
}

install kube-prometheus-stack prometheus-community/kube-prometheus-stack "$KUBE_PROMETHEUS_STACK"
install loki grafana/loki "$LOKI"
install tempo grafana/tempo "$TEMPO"
install otel-collector open-telemetry/opentelemetry-collector "$OTEL_COLLECTOR"
install alloy grafana/alloy "$ALLOY"
# Dashboards and alert rules kept as code next to this script.
kubectl apply -k "$HERE/config"
echo "Grafana: http://grafana.bazaar.localhost (admin / bazaar-local)"
