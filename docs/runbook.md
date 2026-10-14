# Runbook

One section per alert; alerts link here (`runbook_url` in Prometheus, alarm descriptions in CloudWatch).
Staging commands assume the kind cluster (`kubectl` context `kind-bazaar-staging`); on AWS use the
`bazaar-<env>` EKS context and the same namespaces. Grafana: http://grafana.bazaar.localhost.

Every section follows: **what it means → check → act → afterwards**.

## Operations

### Start and stop
| Where | Start | Stop |
|---|---|---|
| Dev (host services) | `make up`, then `make dev-gateway` / `dev-catalog` / … | Ctrl-C, `make down` |
| Compose, everything from images | `make up-full` → http://bazaar.localhost:8000 | `make down` (data kept) |
| Staging (kind) | `make k8s-up` → http://bazaar.localhost; `make k8s-observability` for Grafana | `make k8s-down` (registry images kept) |

`make nuke` deletes the compose volumes; `make urls` prints the local tool URLs.

### Reset data
- Compose / dev: `make db-reset` (drop, migrate, schema, seed). Seeds are idempotent: `make seed` alone
  re-applies them without wiping.
- Staging: `make release` re-runs the db-setup Job (migrations + idempotent seed). For a truly empty
  database, recreate the cluster (`make k8s-down k8s-up`).

### Read consumer lag
- Grafana *Bazaar · Kafka and outbox* → *Consumer lag by group and topic* (`-1` from the exporter
  means no committed offset yet; the panel clamps it to 0).
- CLI: `kubectl -n bazaar-data exec bazaar-dual-0 -- /opt/kafka/bin/kafka-consumer-groups.sh
  --bootstrap-server localhost:9092 --describe --all-groups` (compose: the `kafka` container, port 9092).

### Deploy, roll back, destroy
| | Staging (kind) | AWS |
|---|---|---|
| Deploy | `make release` (build, push, data → db-setup → apps) | Actions → **deploy** (manual, needs `AWS_DEPLOY_ENABLED`) |
| Roll back | `make rollback TAG=<sha>` (images still in the registry) | Re-run **deploy** at the previous sha; migrations only move forward (expand/contract, `docs/drills.md` R7) |
| Destroy | `make k8s-down` | Dev: `cd infra/cdk && npx cdk destroy "bazaar-dev-*"`. Prod keeps data by design (RETAIN, deletion protection): disable protection on purpose, snapshot, then destroy |

After an emergency `kubectl rollout undo`, run `make release` (or `make rollback`) so the applied
manifests match the cluster again.

---

## GatewayErrorRateHigh
More than 1 % of gateway requests answer 5xx for 5 minutes (availability SLO 99.9 %).
- **Check**: Grafana *Bazaar · Services* → error ratio and *4xx / 5xx by route*: one route or all?
  Open an exemplar / Tempo search `{resource.service.name="gateway" && status=error}` and follow the
  trace into the failing service; its logs are one click away (Loki).
- **Act**: one downstream service failing → see [ServiceDown](#servicedown); all routes failing right
  after a release → `make rollback TAG=<previous sha>` (staging) or re-run `deploy.yml` with the
  previous sha (AWS). Database or Redis errors in the logs → check `kubectl -n bazaar-data get pods`.
- **Afterwards**: add a test for the failing path; note the incident in the release notes.

## GatewayLatencyHigh
Gateway p95 above 200 ms for 10 minutes (NFR-03).
- **Check**: *p95 latency by route* — one route (slow query, slow downstream) or everything (CPU)?
  `kubectl -n bazaar top pods`, `kubectl -n bazaar get hpa`; slow spans in Tempo (`duration > 200ms`).
- **Act**: CPU-bound and HPA at max → raise `maxReplicas` or node capacity; one route → find the slow
  span (Prisma query, catalog/order call) and fix or cache it.

## KafkaConsumerLagHigh
A consumer group is more than 1,000 messages behind on a topic for 5 minutes (CloudWatch alarms
`KafkaLag-<group>-<topic>` on AWS point here too).
- **Check**: *Bazaar · Kafka and outbox* → lag by group/topic and *Consumed / s by outcome*. Is the
  consumer running (`kubectl -n bazaar get pods`)? Are messages being retried in a loop (outcome
  `retried` high)? Rebalancing (pods restarting)?
- **Act**: consumer down → [ServiceDown](#servicedown). Stuck on one bad message → it moves to the
  retry topic and finally the DLQ by itself; if it does not, see [DeadLetterNotEmpty](#deadletternotempty).
  Just slow → scale the service (`kubectl -n bazaar scale deploy/<svc> --replicas=3`; partitions = 3).

## DeadLetterNotEmpty
A service gave up on an event after its retries and wrote it to `<topic>.dlq`.
- **Check**: the warning log `event sent to dead-letter topic` (Loki: `{app="<svc>"} |= "dead-letter"`)
  carries the reason; the message keeps it in the `error` header. Kafka UI (compose) or:
  `kubectl -n bazaar-data exec bazaar-dual-0 -- /opt/kafka/bin/kafka-console-consumer.sh
  --bootstrap-server localhost:9092 --topic order.events.dlq --from-beginning --property print.headers=true`
- **Act**: fix the cause (bug, missing data), deploy, then **replay**: consume the DLQ messages and
  produce them back to the main topic with the `delivery-attempt` header removed. Handlers are
  idempotent (processed-event store), so replaying an already-applied event is harmless.
- **Afterwards**: a test reproducing the poison message (drill R4 in `docs/drills.md`).

## OutboxStale
The oldest unsent outbox message of a service is older than 60 s: events are not reaching Kafka.
- **Check**: *Oldest unsent outbox message* / *Outbox backlog*; service logs `outbox relay batch
  failed`; Kafka health (`kubectl -n bazaar-data get kafka bazaar`, broker pod).
- **Act**: Kafka down → restore it; the relay catches up on its own, in order (drill R2). Relay
  stuck on one row (bad topic) → the log names it; fix and redeploy. Never delete outbox rows by hand.

## ServiceDown
Prometheus cannot scrape a service pod for 2 minutes.
- **Check**: `kubectl -n bazaar get pods`, `kubectl -n bazaar describe pod <pod>` (probe failures,
  OOMKilled, image pull), `kubectl -n bazaar logs <pod> --previous`.
- **Act**: readiness failing on a dependency → fix the dependency (`/health/ready` lists which);
  bad release → rollback (a broken image never becomes ready, so the old pods keep serving — drill R5).

## PodCrashLooping
A pod in `bazaar` or `bazaar-data` restarted more than twice in 15 minutes.
- **Check**: `kubectl describe pod` → last state reason (`OOMKilled`, `Error`), logs `--previous`.
- **Act**: OOM → raise the memory limit in `infra/k8s/base/<app>.yaml` (or the store's StatefulSet);
  config error → fix the ConfigMap/Secret and roll the deployment.

---

## AWS CloudWatch alarms (ObservabilityStack, EdgeMonitoringStack)

## AuroraCpu
Aurora writer CPU above 80 %. Check Performance Insights for the top SQL; raise
`aurora.maxCapacityAcu` in `infra/cdk/lib/config/environments.ts` if load is legitimate.

## CacheCpu
Valkey engine CPU above 75 %. Hot keys or too many rate-limit writes; consider a larger node type.

## CacheMemory
Valkey memory above 80 %. Check key counts by prefix; caches must have TTLs; scale the node type.

## NodeCpu
EKS nodes above 80 % CPU. Check the HPAs; raise `eks.maxNodes` or the instance type.

## Edge-5xx
More than 1 % of CloudFront requests for a distribution fail with 5xx. Origin errors → see
[GatewayErrorRateHigh](#gatewayerrorratehigh); S3 origins → bucket policy / OAC (EdgeStack).

## Edge-OriginLatency
p95 CloudFront origin latency above 500 ms. ALB → see [GatewayLatencyHigh](#gatewaylatencyhigh);
check ALB target health and the HPAs.

---

## Rotating secrets that have no managed rotation (AWS)
Aurora users rotate automatically (Secrets Manager). The others, named in their cdk-nag
acknowledgements:
- **MSK SCRAM** (`AmazonMSK_bazaar-<env>-apps`): create a new secret with a new password, associate it
  with the cluster (`aws kafka batch-associate-scram-secret`), let External Secrets refresh (≤ 1 h or
  annotate the ExternalSecret `force-sync`), restart the services, then disassociate the old secret.
- **Valkey AUTH** (`bazaar/<env>/cache/auth`): `aws elasticache modify-replication-group
  --auth-token <new> --auth-token-update-strategy ROTATE`, update the secret, restart the services,
  then the same command with `SET` to drop the old token.
- **Atlas users** (`bazaar/<env>/atlas/*`): update the password in Atlas, then the secret; restart.
- **App keys** (`bazaar/<env>/app/*`): update the secret, restart every service at once
  (`kubectl -n bazaar rollout restart deploy`) — gateway and services must share the same value.
- **JWT keys** (`bazaar/<env>/gateway/jwt-*`): publish the new public key next to the old one in the
  JWKS first, then switch the private key; access tokens live 15 minutes.
