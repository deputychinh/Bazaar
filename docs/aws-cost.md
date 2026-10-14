# What production would cost (rough monthly estimate)

**Estimate, not a quote.** On-demand list prices for ap-southeast-1 as remembered at writing time,
no Savings Plans, light traffic (~1 M page views, ~500 GB out per month). Re-check every line in
the AWS Pricing Calculator and the MongoDB Atlas price list before quoting a client.

| Item | Prod (config) | Prod ≈ USD | Dev (config) | Dev ≈ USD |
|---|---|---:|---|---:|
| EKS control plane | 1 cluster | 73 | 1 cluster | 73 |
| EKS nodes | 3 × m7g.large | 225 | 2 × t4g.large | 100 |
| NAT gateways | 3 + data | 160 | 1 + data | 50 |
| Interface endpoints | 5 services × 3 AZ + Atlas | 175 | same | 175 |
| Aurora MySQL Serverless v2 | writer + reader, ~2 ACU each | 480 | 0.5–2 ACU writer | 90 |
| Amazon MSK | 3 × kafka.m7g.large + 600 GB | 600 | 3 × kafka.t3.small + 60 GB | 130 |
| ElastiCache Valkey | 2 × cache.m7g.large | 280 | 1 × cache.t4g.micro | 15 |
| MongoDB Atlas | M30, 3 nodes + PrivateLink | 420 | M10 | 65 |
| ALB | 1 + LCUs | 35 | 1 | 25 |
| CloudFront + WAF | 500 GB out, 3 distributions, 1 web ACL | 75 | low | 15 |
| CloudWatch | logs (90 d), metrics, alarms, Container Insights | 90 | (14 d) | 30 |
| S3, ECR, Secrets Manager, Route 53, SES, KMS | | 35 | | 20 |
| **Total** | | **≈ 2,650** | | **≈ 790** |

## Where the money goes and what to do about it
- **Data tier is ~70 % of prod.** MSK and Atlas dominate: a Compute Savings Plan does not cover them;
  MSK Serverless or a smaller Atlas tier are the first levers once real traffic is known.
- **Interface endpoints cost the same in dev and prod.** In dev, dropping them (traffic via the one NAT)
  saves ~$175 at the price of NAT data charges.
- **Nodes and NAT**: a 1-year Compute Savings Plan cuts EC2/EKS node cost ~30 %; 3 NATs are the price
  of surviving an AZ outage.
- Dev can be stopped outside working hours (scale node group to 0, pause Atlas, stop Aurora) for
  roughly half its bill.
