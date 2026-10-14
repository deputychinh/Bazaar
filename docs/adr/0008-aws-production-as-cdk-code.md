# ADR 0008 — Production on AWS as CDK code, never deployed

- Status: Accepted
- Date: 2026-10-14
- Plan: §0.2 (environments), §9A, BZ-071..077

## Context
The project runs entirely on a laptop, yet it should show what production would be: the same
containers on managed infrastructure, reviewed and tested like a real team's — without an AWS bill.

## Decision
- **AWS CDK in TypeScript** (`infra/cdk`), same language and test runner (Vitest) as the rest.
  One typed config file for dev and prod; account ids are placeholders, AZs cached in
  `cdk.context.json`, so `cdk synth` needs no credentials.
- **Managed services** replace the local stores: Aurora MySQL Serverless v2, Amazon MSK
  (TLS + SASL/SCRAM), ElastiCache Valkey, **MongoDB Atlas** over PrivateLink (official CloudFormation
  constructs) instead of DocumentDB, so production runs the same MongoDB as local (text indexes,
  transactions, aggregation), plus S3 and SES.
- **EKS** (aws-eks-v2) with managed Graviton node groups, not Auto Mode: node size and disks stay ours.
  Apps get AWS identities through **EKS Pod Identity**; secrets reach pods through **External
  Secrets** from Secrets Manager and SSM. No static AWS keys anywhere, CI included (GitHub OIDC).
- **CloudFront + WAF** in front of everything; WAF and viewer certificates in a us-east-1 stack
  (CloudFront's requirement), linked by cross-region references.
- **cdk-nag (AwsSolutions)** fails the synth; each accepted finding is acknowledged on the exact
  construct with its reason. Vitest asserts the security properties that matter (encryption, no
  public data ports, least-privilege grants) plus resource-inventory snapshots.
- The apps needed small, env-switched changes (BZ-077); local defaults are unchanged.
- `deploy.yml` is complete but requires a manual trigger *and* `AWS_DEPLOY_ENABLED=true`.

## Consequences
- `make aws-test aws-synth` and the `cdk` workflow prove the infrastructure compiles, is internally
  consistent and passes the security rule pack; they cannot prove it deploys — some details
  (MSK version strings, Atlas registry types) are only checked by a real deployment.
- Cost estimate in `docs/aws-cost.md`; operating notes and known gaps in `docs/aws.md`.
- Next steps when an account exists: deploy dev, close the gaps listed in `docs/aws.md`,
  consider Argo CD for the app rollout (plan §9A.3).
