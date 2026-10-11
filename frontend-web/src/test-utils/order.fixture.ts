import type { OrderView } from '@/interfaces/order.interface';

/** A confirmed order with one shop and one item. */
export const orderFixture = (overrides: Partial<OrderView> = {}): OrderView =>
  ({
    id: '01990000-0000-7000-9000-0000000000ab',
    status: 'CONFIRMED',
    totalUsdCents: 3000,
    cancelReason: null,
    payment: { status: 'SUCCEEDED', cardLast4: '4242' },
    createdAt: '2026-10-11T08:00:00.000Z',
    updatedAt: '2026-10-11T08:00:00.000Z',
    sellerOrders: [
      {
        id: 'so-1',
        orderId: '01990000-0000-7000-9000-0000000000ab',
        sellerId: 'seller-1',
        shop: { id: 'shop-1', name: 'Hội An Lights' },
        status: 'CONFIRMED',
        subtotalUsdCents: 3000,
        cancelReason: null,
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        createdAt: '2026-10-11T08:00:00.000Z',
        items: [
          {
            id: 'i-1',
            productId: 'p1',
            productSlug: 'silk-lantern',
            variantSku: 'LAN-RED',
            title: { en: 'Silk lantern', vi: 'Đèn lồng lụa' },
            variantLabel: { en: 'Red', vi: 'Đỏ' },
            imageUrl: null,
            quantity: 2,
            unitPriceUsdCents: 1500,
          },
        ],
      },
    ],
    ...overrides,
  }) as OrderView;
