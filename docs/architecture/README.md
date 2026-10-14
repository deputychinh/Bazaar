# Architecture diagrams

draw.io sources (`*.drawio`, open with draw.io desktop or diagrams.net) with PNG exports next to them.
Re-export after editing: `drawio -x -f png -b 12 -s 1.5 -o <name>.png <name>.drawio`.

## System
| Diagram | What it shows |
|---|---|
| [architecture](architecture.png) | Frontends, gateway, services, their stores, Kafka |
| [rendering_modes](rendering_modes.png) | Which pages are SSG, ISR, SSR, and the admin SPA |
| [event_map](event_map.png) | Topics with their events, producers and consumers |
| [order_state](order_state.png) | Order (and seller order) state machine |
| [erd_mysql](erd_mysql.png) | `bazaar_identity` and `bazaar_order` tables (from `schema.prisma`) |
| [collections_mongo](collections_mongo.png) | `bazaar_catalog` and `bazaar_notification` collections |

## Deployment
| Diagram | What it shows |
|---|---|
| [k8s_deployment](k8s_deployment.png) | Staging on kind: namespaces, workloads, jobs, add-ons |
| [aws_deployment](aws_deployment.png) | Production on AWS: VPC tiers, EKS, managed stores, edge |
| [aws_cicd](aws_cicd.png) | The manual deploy pipeline and the checks before it |

## Flows (sequences)
| Diagram | Flow |
|---|---|
| [seq_b1_sign_up](seq_b1_sign_up.png) | B1 sign up and verify the email |
| [seq_b2_browse_ssr](seq_b2_browse_ssr.png) | B2 browse a category (SSR) |
| [seq_b3_place_order](seq_b3_place_order.png) | B3 place an order — the saga, happy path |
| [seq_b4_stock_rejected](seq_b4_stock_rejected.png) | B4 stock rejected |
| [seq_b5_payment_failed](seq_b5_payment_failed.png) | B5 payment failed and compensation |
| [seq_b6_live_status](seq_b6_live_status.png) | B6 live order status over SSE |
| [seq_b7_isr_revalidate](seq_b7_isr_revalidate.png) | B7 product update → ISR revalidation |
