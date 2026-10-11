import { CancelReason, OrderStatus, PaymentStatus, SellerOrderStatus } from '@bazaar/contracts';

import type { OrderRow } from '../../../interfaces/order-row.interface.js';

import { OrderMapper } from './order.mapper.js';

const at = new Date('2026-10-11T08:00:00.000Z');

const row: OrderRow = {
  id: 'o1',
  shopperId: 'shopper-1',
  status: OrderStatus.Cancelled,
  totalUsdCents: 1500,
  cancelReason: CancelReason.PaymentFailed,
  idempotencyKey: 'k',
  createdAt: at,
  updatedAt: at,
  payment: {
    id: 'pay1',
    orderId: 'o1',
    status: PaymentStatus.Failed,
    providerToken: 'tok_secret',
    providerRef: null,
    cardLast4: '0002',
    amountUsdCents: 1500,
    failureReason: 'card_declined',
    createdAt: at,
    updatedAt: at,
  },
  sellerOrders: [
    {
      id: 'so1',
      orderId: 'o1',
      sellerId: 'seller-1',
      shopId: 'shop-1',
      shopName: 'Hội An Lights',
      status: SellerOrderStatus.Cancelled,
      subtotalUsdCents: 1500,
      cancelReason: CancelReason.PaymentFailed,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: at,
      createdAt: at,
      updatedAt: at,
      items: [
        {
          id: 'i1',
          sellerOrderId: 'so1',
          productId: 'p1',
          productSlug: 'silk-lantern',
          variantSku: 'LAN-RED',
          titleSnapshot: { en: 'Silk lantern' },
          variantLabel: { en: 'Red', vi: 'Đỏ' },
          imageUrl: null,
          quantity: 1,
          unitPriceUsdCents: 1500,
        },
      ],
    },
  ],
};

describe('OrderMapper', () => {
  it('maps a row to the shopper view without provider secrets', () => {
    const view = OrderMapper.toView(OrderMapper.toDomain(row));

    expect(view).toMatchObject({
      id: 'o1',
      status: OrderStatus.Cancelled,
      cancelReason: CancelReason.PaymentFailed,
      payment: { status: PaymentStatus.Failed, cardLast4: '0002' },
      createdAt: '2026-10-11T08:00:00.000Z',
    });
    expect(view.sellerOrders[0]).toMatchObject({
      shop: { id: 'shop-1', name: 'Hội An Lights' },
      cancelledAt: '2026-10-11T08:00:00.000Z',
      items: [expect.objectContaining({ title: { en: 'Silk lantern' }, quantity: 1 })],
    });
    expect(JSON.stringify(view)).not.toContain('tok_secret');
  });

  it('fails loudly on an unknown stored status', () => {
    expect(() => OrderMapper.toDomain({ ...row, status: 'LOST' })).toThrow(/Unknown enum value/);
  });
});
