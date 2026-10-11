`schema.sql` is generated from `services/order/prisma/schema.prisma` (`npm run db:schema-sql -w @bazaar/order`).
`data.sql` seeds past orders of shopper.linh in every settled state (hand-written, idempotent).
