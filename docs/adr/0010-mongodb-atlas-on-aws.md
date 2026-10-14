# ADR 0010 — MongoDB on AWS: MongoDB Atlas, not DocumentDB

- Status: Accepted
- Date: 2026-10-14
- Plan: §9A.1, BZ-073

## Context
Production on AWS (ADR 0009) needs a managed MongoDB for catalog and notifications. Amazon DocumentDB
is AWS-native but only MongoDB-compatible: it differs in text indexes, some aggregation stages and
transaction limits — exactly what catalog search and stock reservations rely on.

## Decision
- **MongoDB Atlas**, dedicated cluster in the same region (M10 dev, M30 prod, 3 electable nodes),
  created from CDK with the official `awscdk-resources-mongodbatlas` constructs (DataStack).
- Reached over **AWS PrivateLink** only (interface endpoint in isolated subnets, security group
  admitting the EKS nodes); no public IP access list.
- One database user per service (readWrite on its own database), passwords generated in Secrets
  Manager; Atlas API keys stored as the CloudFormation profile secret `cfn/atlas/profile/bazaar-<env>`.

## Consequences
- Production runs the same MongoDB as local, so behaviour and indexes match (`backend/db/*/schema.js`).
- Atlas is billed and administered outside AWS: a second vendor and separate access control; its users
  rotate by runbook, not by Secrets Manager. Cost in `docs/aws-cost.md`.
- The SRV host of the private endpoint is set once after creation (`docs/aws.md`).
