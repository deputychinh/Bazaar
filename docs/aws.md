# Production on AWS (written, tested, never deployed)

Plan §9A, ADR 0008. Everything here synthesizes and is tested locally (`make aws-test aws-synth`);
nothing has been deployed — the project has no AWS account.

## Stacks (`infra/cdk`, one set per environment: dev, prod)
| Stack | Region | Contents |
|---|---|---|
| `bazaar-<env>-ci` | main | ECR repo per image (scan on push, immutable tags), GitHub OIDC deploy role |
| `bazaar-<env>-network` | main | VPC over 3 AZs (public / private / isolated), NAT, endpoints, flow logs |
| `bazaar-<env>-data` | main | Aurora MySQL, MSK, Valkey, MongoDB Atlas + PrivateLink, S3 images/backups, KMS, secrets, endpoint parameters |
| `bazaar-<env>-cluster` | main | EKS 1.35, Graviton node group, add-ons, Pod Identity roles, External Secrets |
| `bazaar-<env>-edge-global` | us-east-1 | WAF web ACL, viewer certificate |
| `bazaar-<env>-edge` | main | CloudFront (site, admin, images), S3 static buckets, Route 53, origin certificate |
| `bazaar-<env>-observability` | main | Alarms (Aurora, Kafka lag, Valkey, EKS nodes) → SNS, dashboard |
| `bazaar-<env>-edge-monitoring` | us-east-1 | CloudFront 5xx rate and p95 origin latency alarms |

Sizes, AZs, retention and the domain live in `infra/cdk/lib/config/environments.ts` — the only place
to change them. Account ids there are placeholders.

## One-time setup per account (the runbook, before the first `cdk deploy`)
1. `cdk bootstrap aws://<account>/ap-southeast-1 aws://<account>/us-east-1`.
2. Activate the MongoDB Atlas CloudFormation resource types in the region and store Atlas API keys in
   Secrets Manager as `cfn/atlas/profile/bazaar-<env>`; put the Atlas org id in SSM at
   `/bazaar/<env>/atlas/org-id`.
3. Verify the SES domain (and leave the sandbox for prod).
4. Create the access-token keys (`make keys` locally, then upload):
   `bazaar/<env>/gateway/jwt-private` and `bazaar/<env>/gateway/jwt-public` in Secrets Manager.
5. After the data stack exists, write the Atlas private-endpoint SRV host to
   `/bazaar/<env>/endpoints/atlas-srv-host` (Atlas UI → Connect → Private endpoint).
6. Repository variables for `deploy.yml`: `AWS_ACCOUNT_ID`, `DOMAIN`, `VPC_CIDR`, and finally
   `AWS_DEPLOY_ENABLED=true`. A GitHub environment `prod` with required reviewers gates prod.

## How a release runs (`.github/workflows/deploy.yml`, manual)
1. Images built for arm64 (Graviton) and pushed to ECR, tag = git sha.
2. `cdk deploy bazaar-<env>-*`.
3. MSK bootstrap brokers → SSM `/bazaar/<env>/endpoints/kafka-bootstrap` (not a CloudFormation attribute).
4. The AWS overlay is rendered with image tags pinned and `${…}` placeholders filled by `envsubst`
   (`ENV, ACCOUNT, AWS_REGION, DOMAIN, VPC_CIDR, ORIGIN_CERTIFICATE_ARN`).
5. SecretStores/ExternalSecrets first; once they are Ready, the `db-migrate` Job: MySQL users →
   Prisma migrations → MSK topics (from `infra/docker/kafka/topics.txt`) → MongoDB schema.
6. Apps applied, rollouts awaited; the ALB name → `/bazaar/<env>/edge/alb-dns-name` (dev origin).
7. Admin SPA and `/_next/static` synced to S3, CloudFront invalidated, smoke test.

## The AWS overlay (`infra/k8s/overlays/aws`)
- Base apps, admin Deployment removed (CloudFront serves it from S3), Traefik Ingress replaced by an
  ALB Ingress (`/api` → gateway, `/` → web; HTTPS on `origin.<domain>`).
- Secrets: `bazaar-secrets` (connection URLs assembled from Secrets Manager credentials and SSM
  endpoints, passwords URL-encoded), `bazaar-kafka` (SCRAM user + brokers, added to every service),
  `gateway-jwt`, `bazaar-db-admin` (migration Job only).
- Config switches from BZ-077: `KAFKA_SSL`, S3 without keys (Pod Identity), CDN image URLs, SES mail,
  `COOKIE_SECURE=true`, `TRUST_PROXY_HOPS=2` (CloudFront + ALB).
- Two replicas, HPA 2–6, PDB `minAvailable: 1`; NetworkPolicy admits the ALB from the VPC CIDR.

## Known gaps (accepted, listed so nobody is surprised)
- Dev without a domain reaches the ALB over HTTP from CloudFront (acknowledged in cdk-nag);
  the overlay as written assumes a domain (HTTPS listener).
- No CloudFront → ALB origin secret header yet; the ALB is reachable directly (WAF covers CloudFront only).
- MSK version is set to `3.9.x`; check the versions MSK offers at deploy time.
- Secrets that have no managed rotation (MSK SCRAM, Valkey AUTH, Atlas users, app keys) are rotated by
  runbook steps, each named in its cdk-nag acknowledgement.
