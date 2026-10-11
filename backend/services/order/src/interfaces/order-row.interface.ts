import type { Prisma } from '#prisma';

/** An order row loaded with everything the domain needs. */
export type OrderRow = Prisma.OrderGetPayload<{
  include: { sellerOrders: { include: { items: true } }; payment: true };
}>;
