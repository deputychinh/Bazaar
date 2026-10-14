# Kubernetes (staging on kind)

Production-shaped staging on the laptop (plan §0.2, §9; ADR 0007). Everything below runs locally.

## Prerequisites
`brew install kind kubectl helm k9s` and Docker Desktop with **at least 6 CPU / 10 GB RAM**.
Ports 80 and 443 on 127.0.0.1 must be free (the compose `full` profile uses 8000, so both can run).

## Commands
| Command | What it does |
|---|---|
| `make k8s-up` | Cluster + add-ons, then `make release` |
| `make k8s-up-cluster` | Only the kind cluster, registry `localhost:5001`, Traefik, metrics-server, Strimzi |
| `make release` | Build all images tagged with the git sha, push them, deploy in order |
| `make rollback TAG=<sha>` | Deploy an earlier sha that is still in the registry |
| `make k8s-status` | Nodes, Helm releases, pods |
| `make k8s-down` | Delete the cluster (registry and images are kept) |

## URLs
| URL | What |
|---|---|
| http://bazaar.localhost | Customer site |
| http://admin.bazaar.localhost | Admin site (seller and platform) |
| http://mail.bazaar.localhost | Mailpit — every email sent in the cluster |
| http://storage.bazaar.localhost | Product images (S3 API of RustFS) |

Demo accounts are the seed ones (`admin@bazaar.test`, `seller.minh@bazaar.test`, … password `Bazaar@2026!`).
The Playwright journeys run against the cluster with
`ADMIN_URL=http://admin.bazaar.localhost GATEWAY_URL=http://bazaar.localhost MAILPIT_URL=http://mail.bazaar.localhost make e2e`.

## Layout
```
infra/k8s/
├── kind/            kind-config.yaml, cluster.sh (registry, add-ons, CoreDNS rewrite)
├── helm/            pinned values for Traefik, metrics-server, Strimzi
├── base/            apps: Deployments, Services, Ingress, NetworkPolicies, HPA, PDB, ConfigMap
├── overlays/local/  data stores (data/), db-setup Job (setup/), secrets made from .env
└── deploy.sh        one release: data → db-setup → apps
```

## How a release runs
1. `secrets.sh` turns `.env` into Secret inputs with in-cluster addresses (`overlays/local/.generated`, git-ignored).
2. The overlay is rendered with every image pinned to the sha (`infra/k8s/.release`, git-ignored).
3. Phase `data`: namespace `bazaar-data` — MySQL, MongoDB, Redis, RustFS (+ bucket Job), Mailpit,
   Strimzi Kafka and its topics. The script waits for the StatefulSets, Kafka `Ready` and the buckets.
4. Phase `setup`: the previous `db-setup` Job is deleted and a new one runs Prisma migrations, the MySQL
   seed, then the MongoDB schema and seed — the same `backend/db` files `make seed` uses.
5. The apps are applied and every rollout is awaited. Pods sleep 5 s in `preStop` so no request is
   dropped while endpoints update.

## Watching it
- `k9s` — pods, logs, events live.
- `kubectl -n bazaar get hpa` — autoscaling on CPU (metrics-server).
- `kubectl -n bazaar-data get kafka,kafkatopic` — Kafka and topics as Strimzi sees them.

## Network rules
Namespace `bazaar` denies all ingress by default. Traefik reaches gateway, web and admin; web reaches
the gateway; the services reach the gateway (JWKS); only the gateway reaches catalog, order and
notification; notification reaches web (ISR). `/internal` routes are therefore reachable from the gateway
only, and still require `INTERNAL_API_KEY`.
