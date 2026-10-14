# ADR 0007 — Kubernetes with Kustomize, kind locally, Strimzi for Kafka

- Status: Accepted
- Date: 2026-10-14
- Plan: §0.2 (environments), §9 (Kubernetes), BZ-064..070

## Context
Staging must behave like production — rolling updates, probes, autoscaling, network isolation,
migrations before rollout — while running entirely on a laptop with no cloud account. Production is
EKS (P8, written but never deployed), so the same manifests have to serve both.

## Decision
- **Images**: one multi-stage Dockerfile for the four NestJS services (`turbo prune`, prod-only deps,
  non-root, tini), Next.js `standalone` for the web, nginx-unprivileged for the admin SPA. npm and
  friends are removed from runtime images. Tag = git sha. Trivy gates CI on fixable HIGH/CRITICAL.
- **Manifests**: plain YAML with **Kustomize** — `base/` holds the environment-neutral apps
  (Deployments, Services, Ingress, NetworkPolicies, HPA, PDB); `overlays/local` adds in-cluster data
  stores, secrets from `.env` and the db-setup Job; `overlays/aws` (P8) swaps them for managed
  endpoints. No Helm chart of our own: the apps are few and overlays read more clearly than templates.
- **Cluster**: **kind** (1 control-plane + 2 workers) with a local registry on `localhost:5001`;
  Helm only for third-party add-ons with pinned chart versions (Traefik, metrics-server, Strimzi).
- **Kafka**: the **Strimzi** operator; `Kafka`, `KafkaNodePool` and one `KafkaTopic` per topic are
  declared as code, generated from `infra/docker/kafka/topics.txt` (the single source for compose too).
- **Release order** (`infra/k8s/deploy.sh`): data stores ready → db-setup Job (Prisma migrations,
  seed) completed → apps rolled out. Rollback = deploying an earlier sha; migrations stay additive.
- **Edge**: Traefik is the single trusted hop (`TRUST_PROXY_HOPS=1`); `/api` goes straight to the
  gateway on both sites. CoreDNS rewrites `storage.bazaar.localhost` to Traefik so image URLs are the
  same inside and outside the cluster.

## Consequences
- `make k8s-up` gives a production-shaped staging in a few minutes; `make release` / `make rollback`.
- Cost: a laptop needs about 6 GB of Docker memory for the cluster; first image pulls are slow.
- The compose `full` profile mirrors the same routes with an nginx edge, so most issues show up
  before Kubernetes is involved.
- Known gaps, accepted for now: NetworkPolicies only cover namespace `bazaar` (the data namespace
  is open inside the cluster); one replica of every store; Kafka runs a different minor version
  (4.2, what Strimzi 1.3 ships) than compose (4.3).
